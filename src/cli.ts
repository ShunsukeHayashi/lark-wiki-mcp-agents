#!/usr/bin/env node

/**
 * Lark Wiki MCP Agent CLI
 */

import { program } from 'commander';
import * as dotenv from 'dotenv';
import { createAgent } from './index';
import * as readline from 'readline';

// Load environment variables
dotenv.config();

// CLI Program
program
  .name('lark-wiki-agent')
  .description('Lark Wiki MCP Agent CLI - Control Wiki spaces with commands')
  .version('1.0.0');

// Interactive mode command
program
  .command('interactive')
  .description('Start interactive agent mode')
  .option('-t, --type <type>', 'Agent type (standalone or mcp)', 'mcp')
  .option('--app-id <id>', 'Lark App ID', process.env.LARK_APP_ID)
  .option('--app-secret <secret>', 'Lark App Secret', process.env.LARK_APP_SECRET)
  .option('--space-id <id>', 'Wiki Space ID', process.env.WIKI_SPACE_ID || '7324483648537755682')
  .option('--root-token <token>', 'Root Node Token', process.env.ROOT_NODE_TOKEN || 'K7xUwSKH0i3fPekyD9ojSsCLpna')
  .option('--enable-genesis', 'Enable Genesis AI system', false)
  .action(async (options) => {
    console.log('🚀 Starting Lark Wiki Agent in interactive mode...\n');
    
    if (!options.appId || !options.appSecret) {
      console.error('❌ Error: App ID and App Secret are required');
      process.exit(1);
    }

    const agent = createAgent({
      type: options.type,
      appId: options.appId,
      appSecret: options.appSecret,
      spaceId: options.spaceId,
      rootNodeToken: options.rootToken,
      enableGenesis: options.enableGenesis
    });

    // Initialize agent
    if (agent.initialize) {
      await agent.initialize();
    }

    console.log('✅ Agent initialized successfully');
    console.log('📝 Available commands:');
    console.log('  - C1.<operation>: Wiki Space operations');
    console.log('  - C2.<operation>: Node management');
    console.log('  - C3.<operation>: Permission management');
    console.log('  - C4.<operation>: Content operations');
    console.log('  - C5.<operation>: Automation');
    console.log('  - RUN ALL: Execute all commands');
    console.log('  - Run C1 C2: Execute specific commands');
    console.log('  - help: Show available operations');
    console.log('  - exit: Exit the program\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'wiki-agent> '
    });

    rl.prompt();

    rl.on('line', async (line) => {
      const input = line.trim();
      
      if (input === 'exit') {
        console.log('\n👋 Goodbye!');
        if (agent.close) {
          await agent.close();
        }
        process.exit(0);
      }
      
      if (input === 'help') {
        showHelp();
        rl.prompt();
        return;
      }

      if (input) {
        try {
          // Parse command and params
          const [command, ...paramsParts] = input.split(' ');
          let params = {};
          
          // Simple JSON parameter parsing
          if (paramsParts.length > 0) {
            const paramsStr = paramsParts.join(' ');
            if (paramsStr.startsWith('{')) {
              params = JSON.parse(paramsStr);
            }
          }

          console.log(`\n⚙️  Executing: ${command}`);
          const result = await agent.execute(command, params);
          console.log('✅ Result:', JSON.stringify(result, null, 2));
        } catch (error: any) {
          console.error('❌ Error:', error.message);
        }
      }
      
      rl.prompt();
    });
  });

// Execute single command
program
  .command('execute <command>')
  .description('Execute a single command')
  .option('-p, --params <json>', 'Command parameters as JSON', '{}')
  .option('-t, --type <type>', 'Agent type (standalone or mcp)', 'mcp')
  .option('--app-id <id>', 'Lark App ID', process.env.LARK_APP_ID)
  .option('--app-secret <secret>', 'Lark App Secret', process.env.LARK_APP_SECRET)
  .option('--space-id <id>', 'Wiki Space ID', process.env.WIKI_SPACE_ID || '7324483648537755682')
  .option('--root-token <token>', 'Root Node Token', process.env.ROOT_NODE_TOKEN || 'K7xUwSKH0i3fPekyD9ojSsCLpna')
  .action(async (command, options) => {
    if (!options.appId || !options.appSecret) {
      console.error('❌ Error: App ID and App Secret are required');
      process.exit(1);
    }

    const agent = createAgent({
      type: options.type,
      appId: options.appId,
      appSecret: options.appSecret,
      spaceId: options.spaceId,
      rootNodeToken: options.rootToken
    });

    if (agent.initialize) {
      await agent.initialize();
    }

    try {
      const params = JSON.parse(options.params);
      const result = await agent.execute(command, params);
      console.log(JSON.stringify(result, null, 2));
      
      if (agent.close) {
        await agent.close();
      }
      process.exit(0);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Show help for available operations
function showHelp() {
  console.log('\n📚 Available Operations:\n');
  
  console.log('C1 - Wiki Space Controller:');
  console.log('  - C1.INITIALIZE: Initialize Wiki space');
  console.log('  - C1.CREATE_SPACE: Create new Wiki space');
  console.log('  - C1.GET_SPACE_INFO: Get space information');
  console.log('  - C1.LIST_SPACES: List all spaces');
  console.log('  - C1.UPDATE_SETTINGS: Update space settings\n');
  
  console.log('C2 - Node Operations:');
  console.log('  - C2.CREATE_NODE: Create new node');
  console.log('  - C2.LIST_NODES: List child nodes');
  console.log('  - C2.MOVE_NODE: Move node to new parent');
  console.log('  - C2.COPY_NODE: Copy node');
  console.log('  - C2.UPDATE_TITLE: Update node title');
  console.log('  - C2.GET_NODE_INFO: Get node information\n');
  
  console.log('C3 - Permission Management:');
  console.log('  - C3.LIST_MEMBERS: List space members');
  console.log('  - C3.ADD_MEMBER: Add new member');
  console.log('  - C3.REMOVE_MEMBER: Remove member');
  console.log('  - C3.UPDATE_PERMISSIONS: Update permissions\n');
  
  console.log('C4 - Content Operations:');
  console.log('  - C4.SEARCH_WIKI: Search Wiki content');
  console.log('  - C4.GET_DOCUMENT_CONTENT: Get document content');
  console.log('  - C4.CREATE_DOCUMENT: Create new document');
  console.log('  - C4.UPDATE_DOCUMENT: Update document');
  console.log('  - C4.WIKI_TO_BITABLE: Convert Wiki to Bitable\n');
  
  console.log('C5 - Automation:');
  console.log('  - C5.CREATE_TASK: Create automation task');
  console.log('  - C5.GET_TASK: Get task status');
  console.log('  - C5.BATCH_OPERATIONS: Execute batch operations');
  console.log('  - C5.GENESIS_CREATE: Create with Genesis AI\n');
  
  console.log('Examples:');
  console.log('  C1.INITIALIZE');
  console.log('  C2.CREATE_NODE {"title": "New Page", "obj_type": "docx"}');
  console.log('  C4.SEARCH_WIKI {"query": "project"}');
  console.log('  RUN ALL');
  console.log('  Run C1 C2 C3\n');
}

// Parse and execute
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}