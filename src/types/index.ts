/**
 * Type definitions for Lark Wiki MCP Agents
 */

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
  FOLDER = 'folder',
  SLIDES = 'slides',
  WIKI = 'wiki'
}

// Wiki Node Structure
export interface WikiNode {
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

// Wiki Space Information
export interface WikiSpace {
  space_id: string;
  name: string;
  description?: string;
  owner_id: string;
  owner_type: string;
  node_token: string;
  obj_token: string;
  obj_type: string;
  space_type: 'person' | 'team';
  visibility: 'public' | 'private';
  open_sharing: 'open' | 'closed';
}

// Permission Member
export interface PermissionMember {
  member_type: 'user' | 'group' | 'department';
  member_id: string;
  perm: string;
  type: string;
  external?: boolean;
}

// Bitable Application
export interface BitableApp {
  app_token: string;
  app_name: string;
  folder_token?: string;
  tables?: BitableTable[];
}

// Bitable Table
export interface BitableTable {
  table_id: string;
  table_name: string;
  revision: number;
  fields?: BitableField[];
}

// Bitable Field
export interface BitableField {
  field_id: string;
  field_name: string;
  type: number;
  property?: any;
  is_primary?: boolean;
}

// Command Result
export interface CommandResult {
  success: boolean;
  command: string;
  result?: any;
  error?: string;
}

// Batch Operation
export interface BatchOperation {
  command: string;
  params?: any;
  dependsOn?: string;
}

// Genesis Requirements
export interface GenesisRequirements {
  requirements: string;
  template?: string;
  app_token?: string;
  language?: 'en' | 'zh';
}

// Agent Events
export interface AgentEvents {
  initialized: void;
  error: Error;
  command_executed: {
    command: string;
    operation: string;
    params: any;
    timestamp: Date;
  };
}