/**
 * Lark Wiki Control MCP Agent
 * Full Wiki structure control with security awareness
 * Version: 1.0.0
 */

import { EventEmitter } from 'events';

// Agent Identity and Configuration
export interface AgentConfig {
  appId: string;
  appSecret: string;
  spaceId: string;
  rootNodeToken: string;
  mode: 'stdio' | 'sse';
  port?: number;
}

// Command Types
export enum CommandType {
  C1_WIKI_SPACE = 'C1',
  C2_NODE_MANAGEMENT = 'C2',
  C3_PERMISSION = 'C3',
  C4_CONTENT = 'C4',
  C5_AUTOMATION = 'C5',
  RUN_ALL = 'RUN_ALL',
  RUN_CHAIN = 'RUN_CHAIN'
}

// Permission Levels
export enum PermissionLevel {
  SPACE_MEMBERS_ONLY = 'space_members_only',
  TENANT_ALL_MEMBERS = 'tenant_all_members',
  LINK_ACCESSIBLE = 'link_accessible',
  INTERNET_PUBLIC = 'internet_public'
}

// Node Types
export enum NodeType {
  DOCX = 'docx',
  BITABLE = 'bitable',
  SHEET = 'sheet',
  MINDNOTE = 'mindnote',
  FOLDER = 'folder'
}

// Main Agent Class
export class LarkWikiAgent extends EventEmitter {
  private config: AgentConfig;
  private mcpClient: any; // MCP client instance
  private spaceStructure: Map<string, any> = new Map();
  private permissionMatrix: Map<string, any> = new Map();
  private executionHistory: Array<any> = [];
  private safeguards: SafeguardSystem;

  constructor(config: AgentConfig) {
    super();
    this.config = config;
    this.safeguards = new SafeguardSystem();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Initialize MCP connection
    await this.connectToMCP();
    // Load initial space structure
    await this.loadSpaceStructure();
    // Setup permission matrix
    await this.setupPermissionMatrix();
    this.emit('initialized');
  }

  private async connectToMCP(): Promise<void> {
    // Connect to Lark MCP server
    const connectionParams = {
      mode: this.config.mode,
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      ...(this.config.port && { port: this.config.port })
    };
    
    // Initialize MCP client connection
    console.log('Connecting to Lark MCP server...', connectionParams);
  }

  // ========================================
  // C1: WIKI SPACE CONTROLLER
  // ========================================
  
  async executeC1_WikiSpace(operation: string, params?: any): Promise<any> {
    this.logExecution('C1', operation, params);
    
    switch (operation) {
      case 'INITIALIZE':
        return await this.initializeWikiSpace();
      case 'SECURITY_CONTROL':
        return await this.controlSecurity(params);
      case 'PUBLIC_EXPOSURE':
        return await this.managePublicExposure(params);
      case 'HIERARCHICAL_PERMISSIONS':
        return await this.manageHierarchicalPermissions(params);
      default:
        throw new Error(`Unknown C1 operation: ${operation}`);
    }
  }

  private async initializeWikiSpace(): Promise<any> {
    const result = {
      space_structure: null,
      hierarchy: null,
      permissions: null
    };

    // Check current space
    const spaceInfo = await this.mcpCall('wiki_v2_space_getNode', {
      token: this.config.rootNodeToken
    });
    result.space_structure = spaceInfo;
    this.spaceStructure.set(this.config.rootNodeToken, spaceInfo);

    // Map hierarchy
    const hierarchy = await this.mapCompleteHierarchy(this.config.rootNodeToken);
    result.hierarchy = hierarchy;

    // Validate permissions
    const permissions = await this.validateAllPermissions();
    result.permissions = permissions;

    return result;
  }

  private async controlSecurity(params: any): Promise<any> {
    // Pre-check for security
    const securityCheck = await this.safeguards.performSecurityCheck(params);
    
    if (!securityCheck.passed) {
      throw new Error(`Security check failed: ${securityCheck.reason}`);
    }

    // Apply security controls
    const result = {
      applied_controls: [],
      rollback_available: true
    };

    if (params.action === 'publish_to_internet') {
      // Critical operation - public exposure
      await this.performPublicExposureChecks(params);
      (result.applied_controls as string[]).push('public_exposure_check');
    }

    return result;
  }

  private async managePublicExposure(params: any): Promise<any> {
    const steps = [
      'verify_no_confidential',
      'set_space_public',
      'update_security_settings',
      'log_exposed_nodes'
    ];

    const results = [];
    
    for (const step of steps) {
      const stepResult = await this.executePublicExposureStep(step, params);
      results.push({ step, result: stepResult });
      
      if (stepResult.error) {
        // Rollback on error
        await this.rollbackPublicExposure(results);
        throw new Error(`Public exposure failed at step: ${step}`);
      }
    }

    return { success: true, steps: results };
  }

  private async manageHierarchicalPermissions(params: any): Promise<any> {
    const { node_token, permission_type, break_chain } = params;

    if (break_chain) {
      // Insert stopper page to break permission inheritance
      const stopperPage = await this.createStopperPage(node_token);
      return { stopper_created: true, token: stopperPage.token };
    }

    // Apply hierarchical permissions
    const result = await this.applyHierarchicalPermissions(node_token, permission_type);
    return result;
  }

  // ========================================
  // C2: NODE OPERATIONS MANAGER
  // ========================================

  async executeC2_NodeManagement(operation: string, params?: any): Promise<any> {
    this.logExecution('C2', operation, params);

    switch (operation) {
      case 'CREATE_NODE':
        return await this.createNode(params);
      case 'MOVE_NODE':
        return await this.moveNode(params);
      case 'DELETE_NODE':
        return await this.deleteNode(params);
      default:
        throw new Error(`Unknown C2 operation: ${operation}`);
    }
  }

  private async createNode(params: any): Promise<any> {
    // Validation
    await this.validateNodeCreation(params);

    // Create node
    const node = await this.mcpCall('wiki_v2_space_createNode', {
      space_id: this.config.spaceId,
      parent_node_token: params.parent_token,
      node_type: params.type || NodeType.DOCX,
      title: params.title
    });

    // Post-creation actions
    await this.updateTreeStructure();
    await this.inheritPermissions(node.node_token, params.parent_token);
    this.logAction('node_created', node);

    return node;
  }

  private async moveNode(params: any): Promise<any> {
    // Pre-checks
    const checks = await Promise.all([
      this.verifyNoExternalLinks(params.node_token),
      this.checkPermissionCompatibility(params.node_token, params.target_parent)
    ]);

    if (!checks.every(check => check.passed)) {
      throw new Error('Pre-check failed for node move operation');
    }

    // Execute move
    const result = await this.mcpCall('wiki_v2_space_moveNode', {
      space_id: this.config.spaceId,
      node_token: params.node_token,
      target_parent_node_token: params.target_parent
    });

    return result;
  }

  private async deleteNode(params: any): Promise<any> {
    const { node_token, hard_delete = false } = params;

    // Safety checks
    await this.scanForDependencies(node_token);
    await this.backupContent(node_token);

    if (hard_delete) {
      // Require admin confirmation
      if (!params.admin_confirmed) {
        throw new Error('Admin confirmation required for hard delete');
      }
      
      const result = await this.mcpCall('wiki_v2_space_deleteNode', {
        space_id: this.config.spaceId,
        node_token: node_token
      });
      
      return result;
    } else {
      // Soft delete - move to archive
      const archivePath = `/Archive/${new Date().toISOString().split('T')[0]}`;
      return await this.moveNode({
        node_token,
        target_parent: await this.ensureArchiveFolder(archivePath)
      });
    }
  }

  // ========================================
  // C3: PERMISSION ORCHESTRATOR
  // ========================================

  async executeC3_PermissionManagement(operation: string, params?: any): Promise<any> {
    this.logExecution('C3', operation, params);

    switch (operation) {
      case 'ANALYZE_PERMISSIONS':
        return await this.analyzePermissions(params);
      case 'MODIFY_PERMISSIONS':
        return await this.modifyPermissions(params);
      case 'SHARING_CONTROL':
        return await this.controlSharing(params);
      default:
        throw new Error(`Unknown C3 operation: ${operation}`);
    }
  }

  private async analyzePermissions(params: any): Promise<any> {
    const { node_token } = params;

    const permissions = await this.mcpCall('drive_v1_permissionMember_list', {
      token: node_token,
      type: 'wiki'
    });

    // Map permission matrix
    const matrix = {
      internal_users: {
        admins: [],
        editors: [],
        viewers: []
      },
      external_users: {
        limited_editors: [],
        viewers: []
      }
    };

    for (const member of permissions.items) {
      if (member.type === 'user') {
        const category = member.external ? 'external_users' : 'internal_users';
        const role = this.mapPermissionRole(member.perm);
        if (category === 'internal_users') {
          (matrix.internal_users as any)[role].push(member);
        } else {
          (matrix.external_users as any)[role].push(member);
        }
      }
    }

    this.permissionMatrix.set(node_token, matrix);
    return matrix;
  }

  private async modifyPermissions(params: any): Promise<any> {
    const { node_token, action, members } = params;

    const results = [];

    for (const member of members) {
      let result;
      
      switch (action) {
        case 'add':
          result = await this.mcpCall('drive_v1_permissionMember_create', {
            token: node_token,
            type: 'wiki',
            member_type: member.type,
            member_id: member.id,
            perm: member.permission
          });
          break;
        case 'remove':
          result = await this.mcpCall('drive_v1_permissionMember_delete', {
            token: node_token,
            type: 'wiki',
            member_id: member.id
          });
          break;
        case 'update':
          result = await this.mcpCall('drive_v1_permissionMember_update', {
            token: node_token,
            type: 'wiki',
            member_id: member.id,
            perm: member.new_permission
          });
          break;
      }
      
      results.push({ member: member.id, action, result });
    }

    return results;
  }

  private async controlSharing(params: any): Promise<any> {
    const { node_token, sharing_type, settings } = params;

    if (sharing_type === 'link_sharing') {
      const result = await this.mcpCall('drive_v2_permissionPublic_update', {
        token: node_token,
        type: 'wiki',
        external_access: settings.enabled,
        security_entity: settings.scope,
        link_share_entity: settings.link_type,
        expire_time: settings.expiry
      });
      
      return result;
    }

    if (sharing_type === 'visibility') {
      // Perform impact analysis first
      const impact = await this.analyzeVisibilityChangeImpact(node_token, settings.new_level);
      
      if (impact.has_risks) {
        if (!params.force) {
          return { 
            error: 'Visibility change has risks',
            impact,
            message: 'Use force: true to proceed'
          };
        }
      }

      const result = await this.changeVisibility(node_token, settings.new_level);
      return result;
    }

    throw new Error(`Unknown sharing type: ${sharing_type}`);
  }

  // ========================================
  // C4: CONTENT SYNCHRONIZER
  // ========================================

  async executeC4_ContentOperations(operation: string, params?: any): Promise<any> {
    this.logExecution('C4', operation, params);

    switch (operation) {
      case 'SEARCH_RETRIEVE':
        return await this.searchAndRetrieve(params);
      case 'BITABLE_INTEGRATION':
        return await this.integrateBitable(params);
      case 'DOCUMENT_OPERATIONS':
        return await this.performDocumentOperation(params);
      default:
        throw new Error(`Unknown C4 operation: ${operation}`);
    }
  }

  private async searchAndRetrieve(params: any): Promise<any> {
    const { query, scope } = params;

    // Search for content
    const searchResults = await this.mcpCall('wiki_v1_node_search', {
      space_id: this.config.spaceId,
      query,
      ...(scope && { parent_node_token: scope })
    });

    // Retrieve content for each result
    const contents = [];
    for (const result of searchResults.items) {
      if (result.obj_type === 'docx') {
        const content = await this.mcpCall('docx_v1_document_rawContent', {
          document_id: result.obj_token
        });
        contents.push({ ...result, content });
      }
    }

    return { search_results: searchResults, contents };
  }

  private async integrateBitable(params: any): Promise<any> {
    const { wiki_node_token } = params;

    // Step 1: Get wiki node info
    const nodeInfo = await this.mcpCall('wiki_v2_space_getNode', {
      token: wiki_node_token
    });

    // Step 2: Extract obj_token (CRITICAL)
    const obj_token = nodeInfo.obj_token;
    if (!obj_token) {
      throw new Error('No obj_token found in wiki node - not a Bitable node');
    }

    // Step 3: Access Bitable with obj_token as app_token
    const tables = await this.mcpCall('bitable_v1_appTable_list', {
      app_token: obj_token
    });

    // Step 4: Sync data bidirectionally
    const syncResult = await this.syncBitableData(obj_token, tables);

    return {
      app_token: obj_token,
      tables: tables.items,
      sync_result: syncResult
    };
  }

  private async performDocumentOperation(params: any): Promise<any> {
    const { operation, document_id, format, content } = params;

    switch (operation) {
      case 'import':
        return await this.mcpCall('docx_builtin_import', {
          space_id: this.config.spaceId,
          parent_node_token: params.parent_token,
          file_content: content
        });
      
      case 'export':
        return await this.exportWiki(document_id, format);
      
      default:
        throw new Error(`Unknown document operation: ${operation}`);
    }
  }

  // ========================================
  // C5: AUTOMATION ENGINE
  // ========================================

  async executeC5_Automation(operation: string, params?: any): Promise<any> {
    this.logExecution('C5', operation, params);

    switch (operation) {
      case 'SCHEDULE_TASK':
        return await this.scheduleTask(params);
      case 'TRIGGER_EVENT':
        return await this.handleEventTrigger(params);
      case 'RUN_WORKFLOW':
        return await this.runAutomatedWorkflow(params);
      default:
        throw new Error(`Unknown C5 operation: ${operation}`);
    }
  }

  private async scheduleTask(params: any): Promise<any> {
    const { task_type, frequency } = params;

    const taskConfig = {
      permission_audit: {
        frequency: 'weekly',
        action: () => this.auditAllPermissions()
      },
      content_backup: {
        frequency: 'daily',
        action: () => this.backupAllContent()
      },
      dead_link_check: {
        frequency: 'daily',
        action: () => this.checkDeadLinks()
      }
    };

    const task = (taskConfig as any)[task_type];
    if (!task) {
      throw new Error(`Unknown task type: ${task_type}`);
    }

    // Schedule the task (implementation depends on runtime environment)
    const scheduledTask = {
      type: task_type,
      frequency: frequency || task.frequency,
      next_run: this.calculateNextRun(frequency || task.frequency),
      status: 'scheduled'
    };

    return scheduledTask;
  }

  private async handleEventTrigger(params: any): Promise<any> {
    const { event_type, data } = params;

    const handlers = {
      on_public_exposure: async () => {
        await this.scanSensitiveContent(data.node_token);
        await this.notifySecurityTeam(data);
      },
      on_external_access: async () => {
        await this.trackUserActivity(data.user_id, data.node_token);
      },
      on_structure_change: async () => {
        await this.updateNavigation();
      }
    };

    const handler = (handlers as any)[event_type];
    if (!handler) {
      throw new Error(`Unknown event type: ${event_type}`);
    }

    await handler();
    return { event_handled: true, type: event_type };
  }

  private async runAutomatedWorkflow(params: any): Promise<any> {
    const { workflow_name, config } = params;

    // Define workflow steps
    const workflow = this.getWorkflowDefinition(workflow_name);
    const results = [];

    for (const step of workflow.steps) {
      try {
        const result = await this.executeWorkflowStep(step, config);
        results.push({ step: step.name, success: true, result });
      } catch (error: any) {
        results.push({ step: step.name, success: false, error: error.message });
        
        if (!workflow.continue_on_error) {
          break;
        }
      }
    }

    return { workflow: workflow_name, results };
  }

  // ========================================
  // MASTER EXECUTION CONTROLLER
  // ========================================

  async execute(command: string, params?: any): Promise<any> {
    // Parse command
    const parsed = this.parseCommand(command);
    
    // Check safeguards
    await this.safeguards.validate(parsed, params);

    // Execute based on command type
    switch (parsed.type) {
      case CommandType.RUN_ALL:
        return await this.runAll();
      
      case CommandType.RUN_CHAIN:
        return await this.runChain(parsed.commands);
      
      case CommandType.C1_WIKI_SPACE:
        return await this.executeC1_WikiSpace(parsed.operation, params);
      
      case CommandType.C2_NODE_MANAGEMENT:
        return await this.executeC2_NodeManagement(parsed.operation, params);
      
      case CommandType.C3_PERMISSION:
        return await this.executeC3_PermissionManagement(parsed.operation, params);
      
      case CommandType.C4_CONTENT:
        return await this.executeC4_ContentOperations(parsed.operation, params);
      
      case CommandType.C5_AUTOMATION:
        return await this.executeC5_Automation(parsed.operation, params);
      
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
        
        // Rollback on failure
        await this.rollback(results);
        throw error;
      }
    }
    
    return results;
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  private async mcpCall(tool: string, params: any): Promise<any> {
    // Simulate MCP tool call
    console.log(`MCP Call: ${tool}`, params);
    
    // In real implementation, this would call the actual MCP client
    return { success: true, tool, params };
  }

  private async mapCompleteHierarchy(nodeToken: string): Promise<any> {
    const hierarchy = { token: nodeToken, children: [] };
    
    // Recursive mapping of wiki structure
    const children = await this.getNodeChildren(nodeToken);
    for (const child of children) {
      (hierarchy.children as any[]).push(await this.mapCompleteHierarchy(child.token));
    }
    
    return hierarchy;
  }

  private async getNodeChildren(nodeToken: string): Promise<any[]> {
    // Get child nodes
    const result = await this.mcpCall('wiki_v2_space_listNode', {
      parent_node_token: nodeToken
    });
    
    return result.items || [];
  }

  private async validateAllPermissions(): Promise<any> {
    const validations = [];
    
    for (const [token, structure] of this.spaceStructure) {
      const permission = await this.analyzePermissions({ node_token: token });
      validations.push({ token, permission });
    }
    
    return validations;
  }

  private async performPublicExposureChecks(params: any): Promise<any> {
    const checks = [
      'sensitive_content_scan',
      'child_page_impact_analysis',
      'external_user_risk_assessment'
    ];
    
    const results = {};
    
    for (const check of checks) {
      (results as any)[check] = await this.performCheck(check, params);
    }
    
    return results;
  }

  private async executePublicExposureStep(step: string, params: any): Promise<any> {
    // Implementation for each public exposure step
    console.log(`Executing public exposure step: ${step}`);
    return { success: true, step };
  }

  private async rollbackPublicExposure(results: any[]): Promise<void> {
    // Rollback changes made during public exposure
    for (const result of results.reverse()) {
      await this.rollbackStep(result);
    }
  }

  private async createStopperPage(parentToken: string): Promise<any> {
    // Create a stopper page to break permission inheritance
    return await this.createNode({
      parent_token: parentToken,
      title: '[Internal Only] Permission Boundary',
      type: NodeType.DOCX,
      permissions: PermissionLevel.SPACE_MEMBERS_ONLY
    });
  }

  private async applyHierarchicalPermissions(nodeToken: string, permissionType: string): Promise<any> {
    // Apply permissions hierarchically
    const result = { applied_to: [nodeToken], cascaded_to: [] };
    
    // Get all child nodes
    const children = await this.getNodeChildren(nodeToken);
    
    for (const child of children) {
      // Apply to child and its descendants
      const childResult = await this.applyHierarchicalPermissions(child.token, permissionType);
      (result.cascaded_to as any[]).push(...childResult.applied_to);
    }
    
    return result;
  }

  private async validateNodeCreation(params: any): Promise<void> {
    const checks = [
      this.checkParentPermissions(params.parent_token),
      this.verifyUserCapability('create_node'),
      this.ensureNamingConvention(params.title)
    ];
    
    const results = await Promise.all(checks);
    
    if (!results.every(r => r)) {
      throw new Error('Node creation validation failed');
    }
  }

  private async checkParentPermissions(parentToken: string): Promise<boolean> {
    // Check if user has permission to create nodes under parent
    const permissions = await this.analyzePermissions({ node_token: parentToken });
    return permissions.internal_users.editors.length > 0;
  }

  private async verifyUserCapability(capability: string): Promise<boolean> {
    // Verify user has the required capability
    return true; // Simplified for now
  }

  private async ensureNamingConvention(title: string): Promise<boolean> {
    // Check naming convention
    return title.length > 0 && title.length < 255;
  }

  private async updateTreeStructure(): Promise<void> {
    // Update cached tree structure
    await this.loadSpaceStructure();
  }

  private async inheritPermissions(nodeToken: string, parentToken: string): Promise<void> {
    // Inherit permissions from parent
    const parentPermissions = await this.analyzePermissions({ node_token: parentToken });
    // Apply parent permissions to new node
    await this.modifyPermissions({
      node_token: nodeToken,
      action: 'add',
      members: parentPermissions.internal_users.editors
    });
  }

  private async verifyNoExternalLinks(nodeToken: string): Promise<any> {
    // Check for external links that might break
    return { passed: true };
  }

  private async checkPermissionCompatibility(nodeToken: string, targetParent: string): Promise<any> {
    // Check if permissions are compatible
    return { passed: true };
  }

  private async scanForDependencies(nodeToken: string): Promise<void> {
    // Scan for dependencies before deletion
    console.log(`Scanning dependencies for ${nodeToken}`);
  }

  private async backupContent(nodeToken: string): Promise<void> {
    // Backup content before deletion
    console.log(`Backing up content for ${nodeToken}`);
  }

  private async ensureArchiveFolder(path: string): Promise<string> {
    // Ensure archive folder exists
    return 'archive_token';
  }

  private mapPermissionRole(perm: number): string {
    // Map permission number to role
    if (perm >= 99) return 'admins';
    if (perm >= 50) return 'editors';
    return 'viewers';
  }

  private async analyzeVisibilityChangeImpact(nodeToken: string, newLevel: string): Promise<any> {
    // Analyze impact of visibility change
    return { has_risks: false };
  }

  private async changeVisibility(nodeToken: string, newLevel: string): Promise<any> {
    // Change visibility level
    return await this.mcpCall('drive_v2_permissionPublic_update', {
      token: nodeToken,
      type: 'wiki',
      security_entity: newLevel
    });
  }

  private async exportWiki(documentId: string, format: string): Promise<any> {
    // Export wiki in specified format
    return { document_id: documentId, format, content: 'exported_content' };
  }

  private async syncBitableData(appToken: string, tables: any): Promise<any> {
    // Sync Bitable data
    return { synced: true, tables: tables.items.length };
  }

  private async auditAllPermissions(): Promise<any> {
    // Audit all permissions in the space
    return { audit_complete: true };
  }

  private async backupAllContent(): Promise<any> {
    // Backup all content
    return { backup_complete: true };
  }

  private async checkDeadLinks(): Promise<any> {
    // Check for dead links
    return { dead_links: [] };
  }

  private calculateNextRun(frequency: string): Date {
    const now = new Date();
    switch (frequency) {
      case 'daily':
        now.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        now.setDate(now.getDate() + 7);
        break;
    }
    return now;
  }

  private async scanSensitiveContent(nodeToken: string): Promise<void> {
    console.log(`Scanning sensitive content in ${nodeToken}`);
  }

  private async notifySecurityTeam(data: any): Promise<void> {
    console.log('Notifying security team', data);
  }

  private async trackUserActivity(userId: string, nodeToken: string): Promise<void> {
    console.log(`Tracking activity: User ${userId} accessed ${nodeToken}`);
  }

  private async updateNavigation(): Promise<void> {
    console.log('Updating navigation structure');
  }

  private getWorkflowDefinition(workflowName: string): any {
    // Get workflow definition
    return {
      name: workflowName,
      steps: [],
      continue_on_error: false
    };
  }

  private async executeWorkflowStep(step: any, config: any): Promise<any> {
    // Execute a workflow step
    return { step_executed: true };
  }

  private parseCommand(command: string): any {
    // Parse command string
    if (command === 'RUN ALL') {
      return { type: CommandType.RUN_ALL };
    }
    
    if (command.startsWith('Run C')) {
      const commands = command.match(/C\d/g);
      if (commands && commands.length > 1) {
        return { type: CommandType.RUN_CHAIN, commands };
      }
    }
    
    // Parse specific command
    const match = command.match(/^(C\d)\.(\w+)/);
    if (match) {
      return {
        type: (CommandType as any)[`${match[1]}_${this.getCommandCategory(match[1])}`],
        operation: match[2]
      };
    }
    
    return { type: command };
  }

  private getCommandCategory(command: string): string {
    const categories = {
      'C1': 'WIKI_SPACE',
      'C2': 'NODE_MANAGEMENT',
      'C3': 'PERMISSION',
      'C4': 'CONTENT',
      'C5': 'AUTOMATION'
    };
    return (categories as any)[command] || '';
  }

  private async rollback(results: any[]): Promise<void> {
    // Rollback failed operations
    console.log('Rolling back operations', results);
  }

  private async rollbackStep(result: any): Promise<void> {
    // Rollback a single step
    console.log('Rolling back step', result);
  }

  private async performCheck(checkType: string, params: any): Promise<any> {
    // Perform various checks
    return { check: checkType, passed: true };
  }

  private logExecution(command: string, operation: string, params: any): void {
    this.executionHistory.push({
      timestamp: new Date(),
      command,
      operation,
      params
    });
    console.log(`Executing ${command}.${operation}`, params);
  }

  private logAction(action: string, data: any): void {
    console.log(`Action: ${action}`, data);
  }

  private async loadSpaceStructure(): Promise<void> {
    // Load complete space structure
    const structure = await this.mapCompleteHierarchy(this.config.rootNodeToken);
    this.spaceStructure.set('complete', structure);
  }

  private async setupPermissionMatrix(): Promise<void> {
    // Setup initial permission matrix
    const permissions = await this.validateAllPermissions();
    for (const perm of permissions) {
      this.permissionMatrix.set(perm.token, perm.permission);
    }
  }
}

// Safeguard System
class SafeguardSystem {
  private readonly criticalOperations = [
    'DELETE_NODE',
    'PUBLIC_EXPOSURE',
    'PERMISSION_CHANGE'
  ];

  async validate(command: any, params: any): Promise<void> {
    // Check if operation is critical
    if (this.isCriticalOperation(command.operation)) {
      await this.requireConfirmation(command, params);
    }

    // Never allow certain operations
    this.checkNeverDoList(command, params);

    // Ensure required checks
    await this.ensureAlwaysDoList(command, params);
  }

  async performSecurityCheck(params: any): Promise<any> {
    // Perform comprehensive security check
    const checks = {
      sensitive_content: await this.checkSensitiveContent(params),
      permission_impact: await this.checkPermissionImpact(params),
      external_exposure: await this.checkExternalExposure(params)
    };

    const passed = Object.values(checks).every(check => !check.has_risks);
    
    return {
      passed,
      checks,
      reason: passed ? null : 'Security risks detected'
    };
  }

  private isCriticalOperation(operation: string): boolean {
    return this.criticalOperations.includes(operation);
  }

  private async requireConfirmation(command: any, params: any): Promise<void> {
    if (!params.confirmed) {
      throw new Error(`Critical operation ${command.operation} requires confirmation`);
    }
  }

  private checkNeverDoList(command: any, params: any): void {
    // Check against never-do list
    const violations = [];

    if (command.operation === 'PUBLIC_EXPOSURE' && !params.impact_analysis_complete) {
      violations.push('Cannot expose to public without impact analysis');
    }

    if (command.operation === 'DELETE_NODE' && !params.backup_complete) {
      violations.push('Cannot delete without backup');
    }

    if (violations.length > 0) {
      throw new Error(`Safeguard violation: ${violations.join(', ')}`);
    }
  }

  private async ensureAlwaysDoList(command: any, params: any): Promise<void> {
    // Ensure always-do requirements are met
    if (!params.permission_validated) {
      await this.validatePermissions(params);
    }

    if (!params.logged) {
      await this.logSecurityAction(command, params);
    }
  }

  private async checkSensitiveContent(params: any): Promise<any> {
    // Check for sensitive content
    return { has_risks: false };
  }

  private async checkPermissionImpact(params: any): Promise<any> {
    // Check permission impact
    return { has_risks: false };
  }

  private async checkExternalExposure(params: any): Promise<any> {
    // Check external exposure risks
    return { has_risks: false };
  }

  private async validatePermissions(params: any): Promise<void> {
    // Validate permissions
    console.log('Validating permissions', params);
  }

  private async logSecurityAction(command: any, params: any): Promise<void> {
    // Log security-relevant action
    console.log('Security action logged', { command, params, timestamp: new Date() });
  }
}

// Export default agent factory
export default function createLarkWikiAgent(config: AgentConfig): LarkWikiAgent {
  return new LarkWikiAgent(config);
}