/**
 * Test suite for Lark Wiki MCP Agent
 */

import { LarkWikiAgent } from '../src/agents/lark-wiki-agent';
import { LarkWikiMCPAgent } from '../src/agents/lark-wiki-mcp-agent';
import { CommandType, NodeType, PermissionLevel } from '../src/types';

describe('Lark Wiki Agent', () => {
  let agent: LarkWikiAgent;

  beforeEach(() => {
    agent = new LarkWikiAgent({
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
      spaceId: 'test-space-id',
      rootNodeToken: 'test-root-token',
      mode: 'stdio'
    });
  });

  describe('Command Parsing', () => {
    it('should parse RUN ALL command', async () => {
      const mockExecute = jest.spyOn(agent as any, 'runAll').mockResolvedValue([]);
      await agent.execute('RUN ALL');
      expect(mockExecute).toHaveBeenCalled();
    });

    it('should parse single command', async () => {
      const mockC1 = jest.spyOn(agent, 'executeC1_WikiSpace').mockResolvedValue({});
      await agent.execute('C1.INITIALIZE');
      expect(mockC1).toHaveBeenCalledWith('INITIALIZE', undefined);
    });

    it('should parse command chain', async () => {
      const mockChain = jest.spyOn(agent as any, 'runChain').mockResolvedValue([]);
      await agent.execute('Run C1 C2 C3');
      expect(mockChain).toHaveBeenCalledWith(['C1', 'C2', 'C3']);
    });
  });

  describe('C1 - Wiki Space Operations', () => {
    it('should initialize Wiki space', async () => {
      const mockMcpCall = jest.spyOn(agent as any, 'mcpCall').mockResolvedValue({
        space_structure: {},
        hierarchy: {},
        permissions: {}
      });

      const result = await agent.executeC1_WikiSpace('INITIALIZE');
      
      expect(result).toHaveProperty('space_structure');
      expect(result).toHaveProperty('hierarchy');
      expect(result).toHaveProperty('permissions');
    });

    it('should handle security control operations', async () => {
      const mockSafeguards = jest.spyOn(agent as any, 'safeguards', 'get').mockReturnValue({
        performSecurityCheck: jest.fn().mockResolvedValue({ passed: true })
      });

      const result = await agent.executeC1_WikiSpace('SECURITY_CONTROL', {
        action: 'verify_permissions'
      });

      expect(result).toHaveProperty('applied_controls');
    });
  });

  describe('C2 - Node Management', () => {
    it('should create a new node', async () => {
      const mockMcpCall = jest.spyOn(agent as any, 'mcpCall').mockResolvedValue({
        node_token: 'new-node-token',
        title: 'Test Node'
      });

      const result = await agent.executeC2_NodeManagement('CREATE_NODE', {
        parent_token: 'parent-token',
        title: 'Test Node',
        type: NodeType.DOCX
      });

      expect(result).toHaveProperty('node_token');
      expect(result.title).toBe('Test Node');
    });

    it('should move a node', async () => {
      const mockChecks = jest.spyOn(agent as any, 'verifyNoExternalLinks').mockResolvedValue({ passed: true });
      const mockCompat = jest.spyOn(agent as any, 'checkPermissionCompatibility').mockResolvedValue({ passed: true });
      const mockMcpCall = jest.spyOn(agent as any, 'mcpCall').mockResolvedValue({ success: true });

      const result = await agent.executeC2_NodeManagement('MOVE_NODE', {
        node_token: 'node-to-move',
        target_parent: 'new-parent'
      });

      expect(mockChecks).toHaveBeenCalled();
      expect(mockCompat).toHaveBeenCalled();
      expect(result).toHaveProperty('success');
    });

    it('should handle soft delete', async () => {
      const mockScan = jest.spyOn(agent as any, 'scanForDependencies').mockResolvedValue(undefined);
      const mockBackup = jest.spyOn(agent as any, 'backupContent').mockResolvedValue(undefined);
      const mockMove = jest.spyOn(agent as any, 'moveNode').mockResolvedValue({ success: true });

      const result = await agent.executeC2_NodeManagement('DELETE_NODE', {
        node_token: 'node-to-delete',
        hard_delete: false
      });

      expect(mockScan).toHaveBeenCalled();
      expect(mockBackup).toHaveBeenCalled();
      expect(mockMove).toHaveBeenCalled();
    });
  });

  describe('C3 - Permission Management', () => {
    it('should analyze permissions', async () => {
      const mockMcpCall = jest.spyOn(agent as any, 'mcpCall').mockResolvedValue({
        items: [
          { type: 'user', external: false, perm: 99 },
          { type: 'user', external: true, perm: 50 }
        ]
      });

      const result = await agent.executeC3_PermissionManagement('ANALYZE_PERMISSIONS', {
        node_token: 'test-node'
      });

      expect(result).toHaveProperty('internal_users');
      expect(result).toHaveProperty('external_users');
    });

    it('should modify permissions', async () => {
      const mockMcpCall = jest.spyOn(agent as any, 'mcpCall').mockResolvedValue({ success: true });

      const result = await agent.executeC3_PermissionManagement('MODIFY_PERMISSIONS', {
        node_token: 'test-node',
        action: 'add',
        members: [
          { type: 'user', id: 'user1', permission: 'edit' }
        ]
      });

      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('C4 - Content Operations', () => {
    it('should search Wiki content', async () => {
      const mockMcpCall = jest.spyOn(agent as any, 'mcpCall').mockResolvedValue({
        items: [
          { obj_type: 'docx', obj_token: 'doc1' }
        ]
      });

      const result = await agent.executeC4_ContentOperations('SEARCH_RETRIEVE', {
        query: 'test query'
      });

      expect(result).toHaveProperty('search_results');
      expect(result).toHaveProperty('contents');
    });

    it('should integrate Wiki with Bitable', async () => {
      const mockMcpCall = jest.spyOn(agent as any, 'mcpCall')
        .mockResolvedValueOnce({ obj_token: 'bitable-app-token' })
        .mockResolvedValueOnce({ items: [] });

      const result = await agent.executeC4_ContentOperations('BITABLE_INTEGRATION', {
        wiki_node_token: 'wiki-node'
      });

      expect(result).toHaveProperty('app_token');
      expect(result).toHaveProperty('tables');
    });
  });

  describe('C5 - Automation', () => {
    it('should schedule a task', async () => {
      const result = await agent.executeC5_Automation('SCHEDULE_TASK', {
        task_type: 'permission_audit',
        frequency: 'daily'
      });

      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('frequency');
      expect(result).toHaveProperty('next_run');
    });

    it('should handle event triggers', async () => {
      const mockScan = jest.spyOn(agent as any, 'scanSensitiveContent').mockResolvedValue(undefined);
      const mockNotify = jest.spyOn(agent as any, 'notifySecurityTeam').mockResolvedValue(undefined);

      const result = await agent.executeC5_Automation('TRIGGER_EVENT', {
        event_type: 'on_public_exposure',
        data: { node_token: 'test-node' }
      });

      expect(mockScan).toHaveBeenCalled();
      expect(mockNotify).toHaveBeenCalled();
      expect(result).toHaveProperty('event_handled', true);
    });
  });
});

describe('Lark Wiki MCP Agent', () => {
  let agent: LarkWikiMCPAgent;

  beforeEach(() => {
    agent = new LarkWikiMCPAgent({
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
      spaceId: 'test-space-id',
      rootNodeToken: 'test-root-token'
    });
  });

  describe('MCP Integration', () => {
    it('should initialize MCP server connection', async () => {
      const mockStart = jest.spyOn(agent as any, 'startMCPServer').mockResolvedValue(undefined);
      const mockDiscover = jest.spyOn(agent as any, 'discoverTools').mockResolvedValue(undefined);

      await agent.initialize();

      expect(mockStart).toHaveBeenCalled();
      expect(mockDiscover).toHaveBeenCalled();
    });

    it('should call MCP tools correctly', async () => {
      const mockSend = jest.spyOn(agent as any, 'sendMCPRequest').mockResolvedValue({
        result: { success: true }
      });

      const result = await (agent as any).callMCPTool('wiki.v2.space.get', {
        space_id: 'test-space'
      });

      expect(mockSend).toHaveBeenCalledWith('tools/call', {
        name: 'wiki.v2.space.get',
        arguments: { space_id: 'test-space' }
      });
    });
  });

  describe('Enhanced Operations', () => {
    it('should create Wiki space', async () => {
      const mockCall = jest.spyOn(agent as any, 'callMCPTool').mockResolvedValue({
        space_id: 'new-space',
        name: 'Test Space'
      });

      const result = await agent.executeC1_WikiSpace('CREATE_SPACE', {
        name: 'Test Space',
        description: 'Test Description'
      });

      expect(result).toHaveProperty('space_id');
      expect(result).toHaveProperty('name');
    });

    it('should handle Wiki to Bitable conversion', async () => {
      const mockCall = jest.spyOn(agent as any, 'callMCPTool')
        .mockResolvedValueOnce({ obj_token: 'bitable-token' })
        .mockResolvedValueOnce({ items: [] });

      const result = await agent.executeC4_ContentOperations('WIKI_TO_BITABLE', {
        wiki_node_token: 'wiki-node'
      });

      expect(result).toHaveProperty('app_token', 'bitable-token');
      expect(result).toHaveProperty('tables');
    });
  });
});