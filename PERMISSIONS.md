# Lark Wiki MCP Agent - Permission Setup Guide

This guide explains how to configure the necessary permissions for the Lark Wiki MCP Agent to work properly.

## Required Permissions

The Lark Wiki MCP Agent requires specific permissions to interact with your Lark/Feishu Wiki spaces.

### 1. Application Permissions (Scopes)

Your Lark application needs the following permissions enabled in the [Lark Open Platform](https://open.larksuite.com/app):

#### Wiki Permissions
- `wiki:wiki:readonly` - Read Wiki spaces and nodes
- `wiki:wiki` - Full Wiki access (read/write)
- `wiki:wiki.node` - Node-specific operations
- `drive:drive` - Drive access for permission management

#### Bitable Permissions (for Wiki-Bitable integration)
- `bitable:app` - Access Bitable applications
- `bitable:table` - Access tables
- `bitable:record` - Access records

#### Document Permissions
- `docx:document` - Document operations
- `docx:document.content:readonly` - Read document content

### 2. Setup Steps

#### Step 1: Configure Application Permissions

1. Go to [Lark Open Platform](https://open.larksuite.com/app)
2. Select your application (App ID: `cli_a8d2fdb1f1f8d02d`)
3. Navigate to **Permissions & Scopes**
4. Add the required permissions listed above
5. Click **Save** to apply changes

#### Step 2: Add Application to Wiki Space

1. Open your target Wiki space in Lark/Feishu
2. Click on **Space Settings** (⚙️ icon)
3. Go to **Members** or **Member Management**
4. Click **Add Members**
5. Select **Add Application**
6. Search for your application by name or App ID
7. Set the appropriate permission level:
   - **Viewer** - Read-only access
   - **Editor** - Read and write access
   - **Admin** - Full control including permission management

#### Step 3: Verify Permissions

Test the permissions by running:

```bash
node dist/cli.js execute "C1.INITIALIZE"
```

If successful, you should see the Wiki space information without permission errors.

## Common Permission Errors

### Error Code 131006
**Message**: "permission denied: wiki space permission denied"

**Solution**: 
- Ensure the application has been added as a member to the Wiki space
- Verify that Wiki permissions are enabled in the Open Platform

### Error Code 99991663
**Message**: "The app has not been granted permission"

**Solution**:
- Add the required scopes in the Open Platform
- Wait a few minutes for permissions to propagate

### Error Code 99991668
**Message**: "User is not authorized"

**Solution**:
- Use tenant access token instead of user access token
- Or ensure the user has granted the necessary permissions to the app

## Security Best Practices

1. **Principle of Least Privilege**: Only grant the minimum permissions required
2. **Regular Audits**: Periodically review and audit application permissions
3. **Separate Environments**: Use different App IDs for development and production
4. **Monitor Access**: Track application access logs in the Lark Admin Console

## Testing Permissions

Use these commands to test different permission levels:

```bash
# Test read permissions
node dist/cli.js execute "C4.SEARCH_WIKI {\"query\": \"test\"}"

# Test write permissions (requires wiki:wiki scope)
node dist/cli.js execute "C2.CREATE_NODE {\"title\": \"Test Page\"}"

# Test permission management (requires admin access)
node dist/cli.js execute "C3.LIST_MEMBERS"
```

## Support

If you continue to experience permission issues:

1. Check the [Lark API Documentation](https://open.larksuite.com/document)
2. Verify your App ID and App Secret are correct
3. Contact your Lark workspace administrator
4. Create an issue on [GitHub](https://github.com/ShunsukeHayashi/lark-wiki-mcp-agents/issues)

## Next Steps

Once permissions are configured:

1. Restart Claude Desktop to reload the MCP configuration
2. Test the Wiki tools with your specific space ID
3. Start using the agent for Wiki management tasks

---

🤖 Generated with [Claude Code](https://claude.ai/code)