/**
 * Lark Wiki MCP Agent - Enhanced Version
 * Integrates with lark-openapi-mcp-enhanced for real Wiki operations
 * Version: 2.0.0
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

// Types for MCP communication
interface MCPRequest {
  jsonrpc: '2.0';
  method: string;
  params: any;
  id: number;
}

interface MCPResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: number;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

// Wiki Agent Configuration
export interface WikiAgentConfig {
  appId: string;
  appSecret: string;
  spaceId: string;
  rootNodeToken: string;
  mcpServerPath?: string;
  language?: 'en' | 'zh';
  enableGenesis?: boolean;
}

// Command execution context
interface CommandContext {
  command: string;
  operation: string;
  params: any;
  timestamp: Date;
  executionId: string;
}

// Wiki node information
interface WikiNode {
  node_token: string;
  obj_token?: string;
  obj_type: string;
  parent_id: string;
  node_type: string;
  origin_node_token: string;
  origin_space_id: string;
  has_child: boolean;
  title: string;
  obj_create_time: string;
  obj_edit_time: string;
  node_create_time: string;
  creator: string;
  owner: string;
}

// Permission information
interface PermissionMember {
  member_type: string;
  member_id: string;
  perm: string;
  type: string;
}

/**
 * Enhanced Lark Wiki MCP Agent
 * Provides full Wiki control through MCP server integration
 */
export class LarkWikiMCPAgent extends EventEmitter {
  private config: WikiAgentConfig;
  private mcpProcess: ChildProcess | null = null;
  private requestId: number = 1;
  private pendingRequests: Map<number, { resolve: Function; reject: Function }> = new Map();
  private availableTools: Map<string, MCPTool> = new Map();
  private commandHistory: CommandContext[] = [];
  private initialized: boolean = false;

  // Knowledge base from CLAUDE.md
  private readonly knowledgeBase = {
    spaceId: '7324483648537755682',
    rootNodeToken: 'K7xUwSKH0i3fPekyD9ojSsCLpna',
    criticalNodes: {
      'プロジェクトナレッジ': 'NdVNwfA8di1S1xk2QD9j90nJp2e',
      'AI-BPO事業管理システム': 'JkKnwgeSViU4QWkj7FPj3dUGpVh',
      'AI-BPO_Bitable_AppToken': 'N4p3bChGhajodqs96chj5UDXpRb'
    }
  };

  constructor(config: WikiAgentConfig) {
    super();
    this.config = {
      ...config,
      mcpServerPath: config.mcpServerPath || path.join(__dirname, 'lark-openapi-mcp-enhanced'),
      language: config.language || 'en'
    };
  }

  /**
   * Initialize the MCP server and establish connection
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.startMCPServer();
      await this.discoverTools();
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Start the MCP server process
   */
  private async startMCPServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use the organized MCP server path
      const serverPath = '/Users/shunsuke/Dev/organized/mcp-servers/lark-openapi-mcp-enhanced/dist/cli.js';
      
      // Start MCP server in STDIO mode
      this.mcpProcess = spawn('node', [
        serverPath,
        'mcp',
        '--mode', 'stdio',
        '--app-id', this.config.appId,
        '--app-secret', this.config.appSecret,
        '--language', this.config.language!
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.mcpProcess.stdout?.on('data', (data) => {
        this.handleMCPResponse(data);
      });

      this.mcpProcess.stderr?.on('data', (data) => {
        console.error('MCP Error:', data.toString());
      });

      this.mcpProcess.on('error', (error) => {
        reject(error);
      });

      // Send initialization request
      this.sendMCPRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          logging: {}
        },
        clientInfo: {
          name: 'lark-wiki-agent',
          version: '2.0.0'
        }
      }).then(() => resolve()).catch(reject);
    });
  }

  /**
   * Discover available tools from MCP server
   */
  private async discoverTools(): Promise<void> {
    const response = await this.sendMCPRequest('tools/list', {});
    
    if (response.tools) {
      for (const tool of response.tools) {
        this.availableTools.set(tool.name, tool);
      }
    }
  }

  /**
   * Send request to MCP server
   */
  private sendMCPRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method,
        params,
        id: this.requestId++
      };

      this.pendingRequests.set(request.id, { resolve, reject });

      if (this.mcpProcess?.stdin) {
        this.mcpProcess.stdin.write(JSON.stringify(request) + '\n');
      } else {
        reject(new Error('MCP process not initialized'));
      }
    });
  }

  /**
   * Handle MCP server responses
   */
  private handleMCPResponse(data: Buffer): void {
    const lines = data.toString().split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      try {
        const response: MCPResponse = JSON.parse(line);
        
        if (response.id && this.pendingRequests.has(response.id)) {
          const { resolve, reject } = this.pendingRequests.get(response.id)!;
          this.pendingRequests.delete(response.id);
          
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
        }
      } catch (error) {
        // Ignore parsing errors for non-JSON lines
      }
    }
  }

  /**
   * Call an MCP tool
   */
  private async callMCPTool(toolName: string, args: any): Promise<any> {
    return await this.sendMCPRequest('tools/call', {
      name: toolName,
      arguments: args
    });
  }

  // ========================================
  // C1: WIKI SPACE CONTROLLER
  // ========================================

  async executeC1_WikiSpace(operation: string, params?: any): Promise<any> {
    const context = this.createCommandContext('C1', operation, params);
    
    try {
      switch (operation) {
        case 'INITIALIZE':
          return await this.initializeWikiSpace();
        case 'CREATE_SPACE':
          return await this.createWikiSpace(params);
        case 'GET_SPACE_INFO':
          return await this.getSpaceInfo(params);
        case 'LIST_SPACES':
          return await this.listWikiSpaces(params);
        case 'UPDATE_SETTINGS':
          return await this.updateSpaceSettings(params);
        default:
          throw new Error(`Unknown C1 operation: ${operation}`);
      }
    } finally {
      this.logCommandExecution(context);
    }
  }

  private async initializeWikiSpace(): Promise<any> {
    // Get root node information
    const rootNode = await this.callMCPTool('wiki.v2.space.getNode', {
      token: this.config.rootNodeToken,
      obj_type: 'wiki'
    });

    // List all child nodes
    const children = await this.callMCPTool('wiki.v2.spaceNode.list', {
      space_id: this.config.spaceId,
      parent_node_token: this.config.rootNodeToken
    });

    return {
      space_id: this.config.spaceId,
      root_node: rootNode,
      children: children.items || []
    };
  }

  private async createWikiSpace(params: any): Promise<any> {
    return await this.callMCPTool('wiki.v2.space.create', {
      name: params.name,
      description: params.description,
      open_sharing: params.open_sharing || 'closed'
    });
  }

  private async getSpaceInfo(params: any): Promise<any> {
    return await this.callMCPTool('wiki.v2.space.get', {
      space_id: params.space_id || this.config.spaceId
    });
  }

  private async listWikiSpaces(params: any): Promise<any> {
    return await this.callMCPTool('wiki.v2.space.list', {
      page_size: params.page_size || 20,
      page_token: params.page_token
    });
  }

  private async updateSpaceSettings(params: any): Promise<any> {
    return await this.callMCPTool('wiki.v2.spaceSetting.update', {
      space_id: params.space_id || this.config.spaceId,
      create_setting: params.create_setting,
      security_setting: params.security_setting,
      comment_setting: params.comment_setting
    });
  }

  // ========================================
  // C2: NODE OPERATIONS MANAGER
  // ========================================

  async executeC2_NodeManagement(operation: string, params?: any): Promise<any> {
    const context = this.createCommandContext('C2', operation, params);
    
    try {
      switch (operation) {
        case 'CREATE_NODE':
          return await this.createNode(params);
        case 'LIST_NODES':
          return await this.listNodes(params);
        case 'MOVE_NODE':
          return await this.moveNode(params);
        case 'COPY_NODE':
          return await this.copyNode(params);
        case 'UPDATE_TITLE':
          return await this.updateNodeTitle(params);
        case 'GET_NODE_INFO':
          return await this.getNodeInfo(params);
        default:
          throw new Error(`Unknown C2 operation: ${operation}`);
      }
    } finally {
      this.logCommandExecution(context);
    }
  }

  private async createNode(params: any): Promise<any> {
    return await this.callMCPTool('wiki.v2.spaceNode.create', {
      space_id: this.config.spaceId,
      parent_node_token: params.parent_node_token || this.config.rootNodeToken,
      node_type: params.node_type || 'origin',
      obj_type: params.obj_type || 'docx',
      title: params.title
    });
  }

  private async listNodes(params: any): Promise<any> {
    return await this.callMCPTool('wiki.v2.spaceNode.list', {
      space_id: this.config.spaceId,
      parent_node_token: params.parent_node_token || this.config.rootNodeToken,
      page_size: params.page_size || 50
    });
  }

  private async moveNode(params: any): Promise<any> {
    return await this.callMCPTool('wiki.v2.spaceNode.move', {
      space_id: this.config.spaceId,
      node_token: params.node_token,
      target_parent_token: params.target_parent_token
    });
  }

  private async copyNode(params: any): Promise<any> {
    return await this.callMCPTool('wiki.v2.spaceNode.copy', {
      space_id: this.config.spaceId,
      node_token: params.node_token,
      target_space_id: params.target_space_id || this.config.spaceId,
      target_parent_token: params.target_parent_token,
      title: params.title
    });
  }

  private async updateNodeTitle(params: any): Promise<any> {
    return await this.callMCPTool('wiki.v2.spaceNode.updateTitle', {
      space_id: this.config.spaceId,
      node_token: params.node_token,
      title: params.title
    });
  }

  private async getNodeInfo(params: any): Promise<any> {
    return await this.callMCPTool('wiki.v2.space.getNode', {
      token: params.node_token,
      obj_type: params.obj_type
    });
  }

  // ========================================
  // C3: PERMISSION ORCHESTRATOR
  // ========================================

  async executeC3_PermissionManagement(operation: string, params?: any): Promise<any> {
    const context = this.createCommandContext('C3', operation, params);
    
    try {
      switch (operation) {
        case 'LIST_MEMBERS':
          return await this.listSpaceMembers(params);
        case 'ADD_MEMBER':
          return await this.addSpaceMember(params);
        case 'REMOVE_MEMBER':
          return await this.removeSpaceMember(params);
        case 'UPDATE_PERMISSIONS':
          return await this.updatePermissions(params);
        default:
          throw new Error(`Unknown C3 operation: ${operation}`);
      }
    } finally {
      this.logCommandExecution(context);
    }
  }

  private async listSpaceMembers(params: any): Promise<any> {
    return await this.callMCPTool('wiki.v2.spaceMember.list', {
      space_id: params.space_id || this.config.spaceId,
      page_size: params.page_size || 50
    });
  }

  private async addSpaceMember(params: any): Promise<any> {
    return await this.callMCPTool('wiki.v2.spaceMember.create', {
      space_id: params.space_id || this.config.spaceId,
      member_type: params.member_type,
      member_id: params.member_id,
      member_role: params.member_role
    });
  }

  private async removeSpaceMember(params: any): Promise<any> {
    return await this.callMCPTool('wiki.v2.spaceMember.delete', {
      space_id: params.space_id || this.config.spaceId,
      member_type: params.member_type,
      member_id: params.member_id
    });
  }

  private async updatePermissions(params: any): Promise<any> {
    return await this.callMCPTool('drive.v1.permissionMember.update', {
      token: params.node_token,
      type: 'wiki',
      member_id: params.member_id,
      perm: params.permission
    });
  }

  // ========================================
  // C4: CONTENT SYNCHRONIZER
  // ========================================

  async executeC4_ContentOperations(operation: string, params?: any): Promise<any> {
    const context = this.createCommandContext('C4', operation, params);
    
    try {
      switch (operation) {
        case 'SEARCH_WIKI':
          return await this.searchWiki(params);
        case 'GET_DOCUMENT_CONTENT':
          return await this.getDocumentContent(params);
        case 'CREATE_DOCUMENT':
          return await this.createDocument(params);
        case 'UPDATE_DOCUMENT':
          return await this.updateDocument(params);
        case 'WIKI_TO_BITABLE':
          return await this.wikiToBitable(params);
        default:
          throw new Error(`Unknown C4 operation: ${operation}`);
      }
    } finally {
      this.logCommandExecution(context);
    }
  }

  private async searchWiki(params: any): Promise<any> {
    return await this.callMCPTool('wiki.v1.node.search', {
      space_id: this.config.spaceId,
      query: params.query,
      parent_node_token: params.parent_node_token
    });
  }

  private async getDocumentContent(params: any): Promise<any> {
    return await this.callMCPTool('docx.v1.document.rawContent', {
      document_id: params.document_id
    });
  }

  private async createDocument(params: any): Promise<any> {
    return await this.callMCPTool('docx.v1.document.create', {
      folder_token: params.folder_token,
      title: params.title,
      content: params.content
    });
  }

  private async updateDocument(params: any): Promise<any> {
    return await this.callMCPTool('docx.v1.documentBlock.update', {
      document_id: params.document_id,
      block_id: params.block_id,
      content: params.content
    });
  }

  private async wikiToBitable(params: any): Promise<any> {
    // Critical: Get Wiki node first to extract obj_token
    const nodeInfo = await this.getNodeInfo({ 
      node_token: params.wiki_node_token 
    });
    
    if (!nodeInfo.obj_token) {
      throw new Error('No Bitable app token found in Wiki node');
    }

    // Use obj_token as app_token for Bitable operations
    const tables = await this.callMCPTool('bitable.v1.appTable.list', {
      app_token: nodeInfo.obj_token
    });

    return {
      app_token: nodeInfo.obj_token,
      tables: tables.items || [],
      node_info: nodeInfo
    };
  }

  // ========================================
  // C5: AUTOMATION ENGINE
  // ========================================

  async executeC5_Automation(operation: string, params?: any): Promise<any> {
    const context = this.createCommandContext('C5', operation, params);
    
    try {
      switch (operation) {
        case 'CREATE_TASK':
          return await this.createTask(params);
        case 'GET_TASK':
          return await this.getTask(params);
        case 'BATCH_OPERATIONS':
          return await this.executeBatchOperations(params);
        case 'GENESIS_CREATE':
          return await this.createWithGenesis(params);
        default:
          throw new Error(`Unknown C5 operation: ${operation}`);
      }
    } finally {
      this.logCommandExecution(context);
    }
  }

  private async createTask(params: any): Promise<any> {
    return await this.callMCPTool('wiki.v2.task.create', {
      space_id: this.config.spaceId,
      node_token: params.node_token,
      task_type: params.task_type,
      params: params.task_params
    });
  }

  private async getTask(params: any): Promise<any> {
    return await this.callMCPTool('wiki.v2.task.get', {
      task_id: params.task_id,
      task_type: params.task_type
    });
  }

  private async executeBatchOperations(params: any): Promise<any> {
    const results = [];
    
    for (const operation of params.operations) {
      try {
        const result = await this.execute(operation.command, operation.params);
        results.push({ success: true, operation, result });
      } catch (error: any) {
        results.push({ success: false, operation, error: error.message });
      }
    }
    
    return results;
  }

  private async createWithGenesis(params: any): Promise<any> {
    if (!this.config.enableGenesis) {
      throw new Error('Genesis system not enabled');
    }

    return await this.callMCPTool('genesis.builtin.create', {
      requirements: params.requirements,
      app_token: params.app_token,
      template: params.template
    });
  }

  // ========================================
  // MASTER EXECUTION CONTROLLER
  // ========================================

  async execute(command: string, params?: any): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    const parsed = this.parseCommand(command);
    
    switch (parsed.type) {
      case 'RUN_ALL':
        return await this.runAll();
      
      case 'RUN_CHAIN':
        return await this.runChain(parsed.commands);
      
      case 'C1':
        return await this.executeC1_WikiSpace(parsed.operation || 'INITIALIZE', params);
      
      case 'C2':
        return await this.executeC2_NodeManagement(parsed.operation || 'LIST_NODES', params);
      
      case 'C3':
        return await this.executeC3_PermissionManagement(parsed.operation || 'LIST_MEMBERS', params);
      
      case 'C4':
        return await this.executeC4_ContentOperations(parsed.operation || 'SEARCH_WIKI', params);
      
      case 'C5':
        return await this.executeC5_Automation(parsed.operation || 'BATCH_OPERATIONS', params);
      
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }

  private async runAll(): Promise<any> {
    const commands = ['C1', 'C2', 'C3', 'C4', 'C5'];
    return await this.runChain(commands);
  }

  private async runChain(commands: string[]): Promise<any> {
    const results = [];
    
    for (const cmd of commands) {
      try {
        const result = await this.execute(cmd);
        results.push({ command: cmd, success: true, result });
      } catch (error: any) {
        results.push({ command: cmd, success: false, error: error.message });
      }
    }
    
    return results;
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  private parseCommand(command: string): any {
    if (command === 'RUN ALL') {
      return { type: 'RUN_ALL' };
    }
    
    if (command.startsWith('Run C')) {
      const commands = command.match(/C\d/g);
      if (commands && commands.length > 1) {
        return { type: 'RUN_CHAIN', commands };
      }
      if (commands && commands.length === 1) {
        return { type: commands[0] };
      }
    }
    
    // Parse specific command like "C1.INITIALIZE"
    const match = command.match(/^(C\d)\.(\w+)/);
    if (match) {
      return {
        type: match[1],
        operation: match[2]
      };
    }
    
    // Direct command type
    if (command.match(/^C\d$/)) {
      return { type: command };
    }
    
    return { type: command };
  }

  private createCommandContext(command: string, operation: string, params: any): CommandContext {
    return {
      command,
      operation,
      params,
      timestamp: new Date(),
      executionId: `${command}-${operation}-${Date.now()}`
    };
  }

  private logCommandExecution(context: CommandContext): void {
    this.commandHistory.push(context);
    this.emit('command_executed', context);
  }

  /**
   * Get available tools
   */
  getAvailableTools(): MCPTool[] {
    return Array.from(this.availableTools.values());
  }

  /**
   * Get command history
   */
  getCommandHistory(): CommandContext[] {
    return this.commandHistory;
  }

  /**
   * Close the MCP server connection
   */
  async close(): Promise<void> {
    if (this.mcpProcess) {
      this.mcpProcess.kill();
      this.mcpProcess = null;
    }
    this.initialized = false;
  }
}

// Export factory function
export function createLarkWikiMCPAgent(config: WikiAgentConfig): LarkWikiMCPAgent {
  return new LarkWikiMCPAgent(config);
}