# Lark Wiki MCP Agents

A powerful agent system for controlling Lark/Feishu Wiki spaces using the MCP (Model Context Protocol) tools. This project provides both standalone and MCP-integrated agents for comprehensive Wiki management.

## Features

### 🎯 Five Core Command Systems

- **C1 - Wiki Space Controller**: Initialize, create, and manage Wiki spaces with security controls
- **C2 - Node Operations Manager**: Create, move, copy, and delete Wiki nodes
- **C3 - Permission Orchestrator**: Manage members, permissions, and access controls
- **C4 - Content Synchronizer**: Search, create, update documents, and Wiki-Bitable integration
- **C5 - Automation Engine**: Task automation, batch operations, and Genesis AI integration

### 🚀 Key Capabilities

- **Dual Agent Modes**: Standalone agent or MCP server integrated agent
- **Critical Wiki-Bitable Integration**: Seamlessly convert Wiki nodes to Bitable applications
- **Security-First Design**: Built-in safeguards for public exposure and permission management
- **Hierarchical Permission Control**: Support for permission inheritance and "stopper pages"
- **Genesis AI System**: Create complete Lark Base applications from natural language

## Installation

### Prerequisites

- Node.js >= 16.20.0
- Lark/Feishu App credentials (App ID and App Secret)
- Access to the target Wiki space

### Setup

1. Clone the repository with the enhanced MCP server:
```bash
git clone https://github.com/yourusername/lark-wiki-mcp-agents.git
cd lark-wiki-mcp-agents

# Also clone the enhanced MCP server
git clone https://github.com/ShunsukeHayashi/lark-openapi-mcp-enhanced.git
```

2. Install dependencies:
```bash
npm install

# Build the enhanced MCP server
cd lark-openapi-mcp-enhanced
yarn install
yarn build
cd ..
```

3. Configure environment variables:
```bash
# Create .env file
cat > .env << EOF
LARK_APP_ID=your_app_id
LARK_APP_SECRET=your_app_secret
WIKI_SPACE_ID=7324483648537755682
ROOT_NODE_TOKEN=K7xUwSKH0i3fPekyD9ojSsCLpna
EOF
```

4. Build the project:
```bash
npm run build
```

## Usage

### Interactive CLI Mode

Start the interactive agent:
```bash
node dist/cli.js interactive --type mcp
```

Available commands in interactive mode:
- `C1.INITIALIZE` - Initialize Wiki space
- `C2.CREATE_NODE {"title": "New Page"}` - Create a new Wiki node
- `C3.LIST_MEMBERS` - List space members
- `C4.SEARCH_WIKI {"query": "project"}` - Search Wiki content
- `C5.BATCH_OPERATIONS` - Execute batch operations
- `RUN ALL` - Execute all command sequences
- `Run C1 C2 C3` - Execute specific command chain

### Single Command Execution

Execute a single command:
```bash
node dist/cli.js execute "C1.INITIALIZE" --type mcp
node dist/cli.js execute "C2.CREATE_NODE" --params '{"title": "New Document", "obj_type": "docx"}'
```

### Programmatic Usage

```typescript
import { createAgent } from 'lark-wiki-mcp-agents';

// Create an MCP-integrated agent
const agent = createAgent({
  type: 'mcp',
  appId: 'your_app_id',
  appSecret: 'your_app_secret',
  spaceId: 'your_space_id',
  rootNodeToken: 'your_root_token',
  enableGenesis: true
});

// Initialize the agent
await agent.initialize();

// Execute commands
const result = await agent.execute('C1.INITIALIZE');
console.log(result);

// Create a new Wiki node
const newNode = await agent.execute('C2.CREATE_NODE', {
  title: 'Project Documentation',
  obj_type: 'docx',
  parent_token: 'parent_node_token'
});

// Search Wiki content
const searchResults = await agent.execute('C4.SEARCH_WIKI', {
  query: 'AI-BPO'
});

// Close the agent
await agent.close();
```

## Command Reference

### C1 - Wiki Space Controller

| Command | Description | Parameters |
|---------|-------------|------------|
| `C1.INITIALIZE` | Initialize Wiki space and load structure | None |
| `C1.CREATE_SPACE` | Create new Wiki space | `name`, `description`, `open_sharing` |
| `C1.GET_SPACE_INFO` | Get space information | `space_id` (optional) |
| `C1.LIST_SPACES` | List all accessible spaces | `page_size`, `page_token` |
| `C1.UPDATE_SETTINGS` | Update space settings | `security_setting`, `comment_setting` |

### C2 - Node Operations

| Command | Description | Parameters |
|---------|-------------|------------|
| `C2.CREATE_NODE` | Create new Wiki node | `title`, `obj_type`, `parent_node_token` |
| `C2.LIST_NODES` | List child nodes | `parent_node_token`, `page_size` |
| `C2.MOVE_NODE` | Move node to new parent | `node_token`, `target_parent_token` |
| `C2.COPY_NODE` | Copy node | `node_token`, `target_parent_token`, `title` |
| `C2.UPDATE_TITLE` | Update node title | `node_token`, `title` |
| `C2.GET_NODE_INFO` | Get node information | `node_token`, `obj_type` |

### C3 - Permission Management

| Command | Description | Parameters |
|---------|-------------|------------|
| `C3.LIST_MEMBERS` | List space members | `space_id`, `page_size` |
| `C3.ADD_MEMBER` | Add new member | `member_type`, `member_id`, `member_role` |
| `C3.REMOVE_MEMBER` | Remove member | `member_type`, `member_id` |
| `C3.UPDATE_PERMISSIONS` | Update permissions | `node_token`, `member_id`, `permission` |

### C4 - Content Operations

| Command | Description | Parameters |
|---------|-------------|------------|
| `C4.SEARCH_WIKI` | Search Wiki content | `query`, `parent_node_token` |
| `C4.GET_DOCUMENT_CONTENT` | Get document content | `document_id` |
| `C4.CREATE_DOCUMENT` | Create new document | `folder_token`, `title`, `content` |
| `C4.UPDATE_DOCUMENT` | Update document | `document_id`, `block_id`, `content` |
| `C4.WIKI_TO_BITABLE` | Convert Wiki to Bitable | `wiki_node_token` |

### C5 - Automation

| Command | Description | Parameters |
|---------|-------------|------------|
| `C5.CREATE_TASK` | Create automation task | `node_token`, `task_type`, `task_params` |
| `C5.GET_TASK` | Get task status | `task_id`, `task_type` |
| `C5.BATCH_OPERATIONS` | Execute batch operations | `operations` (array) |
| `C5.GENESIS_CREATE` | Create with Genesis AI | `requirements`, `app_token`, `template` |

## Critical Implementation Details

### Wiki-Bitable Token Mapping

The most critical aspect of Wiki-Bitable integration:

1. **Get Wiki node information** using `wiki.v2.space.getNode`
2. **Extract `obj_token`** from the response
3. **Use `obj_token` as `app_token`** for all Bitable operations

```typescript
// Critical pattern for Wiki-Bitable integration
const nodeInfo = await agent.execute('C2.GET_NODE_INFO', {
  node_token: 'wiki_node_token'
});

const app_token = nodeInfo.obj_token; // This is the Bitable app_token!

// Now use app_token for Bitable operations
const tables = await callMCPTool('bitable.v1.appTable.list', {
  app_token: app_token // Use obj_token here
});
```

### Security Safeguards

The agent includes built-in safeguards:

- **Never expose confidential data** without approval
- **Never grant external users** structural modification rights
- **Never delete without backup**
- **Always validate permissions** before operations
- **Always run impact analysis** before public exposure

### Permission Inheritance

Hierarchical permission management with "stopper pages":

```typescript
// Create a stopper page to break permission inheritance
await agent.execute('C2.CREATE_NODE', {
  title: '[Internal Only] Permission Boundary',
  parent_token: 'parent_node',
  permissions: 'SPACE_MEMBERS_ONLY'
});
```

## Testing

Run the test suite:
```bash
npm test
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Architecture

```
lark-wiki-mcp-agents/
├── src/
│   ├── agents/
│   │   ├── lark-wiki-agent.ts       # Standalone agent
│   │   └── lark-wiki-mcp-agent.ts   # MCP-integrated agent
│   ├── cli.ts                       # CLI interface
│   ├── types/                       # TypeScript definitions
│   └── index.ts                     # Main exports
├── tests/                           # Test suites
├── lark-openapi-mcp-enhanced/      # Enhanced MCP server
└── README.md
```

## Known Limitations

1. **Rate Limiting**: Default limits apply (200 reads/min, 20 writes/min)
2. **Permission Scope**: Some operations require admin privileges
3. **Genesis System**: Requires appropriate Lark Base permissions
4. **External Access**: Limited control for external users

## Contributing

Contributions are welcome! Please ensure:

1. All tests pass
2. Code follows existing patterns
3. Documentation is updated
4. Security safeguards are maintained

## License

MIT

## Support

For issues or questions:
- Create an issue on GitHub
- Check the CLAUDE.md for additional implementation details
- Refer to the Lark Open Platform documentation

## Acknowledgments

- Built on top of [lark-openapi-mcp-enhanced](https://github.com/ShunsukeHayashi/lark-openapi-mcp-enhanced)
- Uses the Lark/Feishu OpenAPI
- Implements MCP (Model Context Protocol) for AI integration