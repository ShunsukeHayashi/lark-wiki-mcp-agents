/**
 * Lark Wiki MCP Agents - Main Entry Point
 */

// Export agent classes
export { LarkWikiAgent, AgentConfig } from './agents/lark-wiki-agent';
export { LarkWikiMCPAgent, WikiAgentConfig } from './agents/lark-wiki-mcp-agent';

// Export factory functions
export { default as createLarkWikiAgent } from './agents/lark-wiki-agent';
export { createLarkWikiMCPAgent } from './agents/lark-wiki-mcp-agent';

// Export types
export * from './types';

/**
 * Quick start function for creating a Wiki agent
 */
export function createAgent(config: {
  type: 'standalone' | 'mcp';
  appId: string;
  appSecret: string;
  spaceId: string;
  rootNodeToken: string;
  enableGenesis?: boolean;
}) {
  if (config.type === 'mcp') {
    const { createLarkWikiMCPAgent } = require('./agents/lark-wiki-mcp-agent');
    return createLarkWikiMCPAgent({
      appId: config.appId,
      appSecret: config.appSecret,
      spaceId: config.spaceId,
      rootNodeToken: config.rootNodeToken,
      enableGenesis: config.enableGenesis
    });
  } else {
    const createLarkWikiAgent = require('./agents/lark-wiki-agent').default;
    return createLarkWikiAgent({
      appId: config.appId,
      appSecret: config.appSecret,
      spaceId: config.spaceId,
      rootNodeToken: config.rootNodeToken,
      mode: 'stdio'
    });
  }
}