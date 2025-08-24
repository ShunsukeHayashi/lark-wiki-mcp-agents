#!/bin/bash

# Start script for Lark Wiki MCP Agent
# Uses the existing lark-openapi-mcp-enhanced bundles

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MCP_SERVER_DIR="$SCRIPT_DIR/lark-openapi-mcp-enhanced"

# Check if MCP server exists
if [ ! -d "$MCP_SERVER_DIR" ]; then
    echo "Error: lark-openapi-mcp-enhanced not found"
    echo "Please run: git clone https://github.com/ShunsukeHayashi/lark-openapi-mcp-enhanced.git"
    exit 1
fi

# Use the bundle script with wiki preset
cd "$MCP_SERVER_DIR"

# Create a custom wiki preset bundle
cat > bundles/wiki-control.json << 'EOF'
{
  "name": "wiki-control",
  "description": "Wiki control agent preset",
  "tools": [
    "wiki.v2.space.create",
    "wiki.v2.space.get",
    "wiki.v2.space.getNode",
    "wiki.v2.space.list",
    "wiki.v2.spaceMember.create",
    "wiki.v2.spaceMember.delete",
    "wiki.v2.spaceMember.list",
    "wiki.v2.spaceNode.copy",
    "wiki.v2.spaceNode.create",
    "wiki.v2.spaceNode.list",
    "wiki.v2.spaceNode.move",
    "wiki.v2.spaceNode.updateTitle",
    "wiki.v2.spaceSetting.update",
    "wiki.v2.task.get",
    "wiki.v1.node.search",
    "docx.v1.document.create",
    "docx.v1.document.rawContent",
    "docx.v1.documentBlock.update",
    "bitable.v1.appTable.list",
    "bitable.v1.appTableField.list",
    "bitable.v1.appTableRecord.create",
    "bitable.v1.appTableRecord.get",
    "bitable.v1.appTableRecord.update",
    "bitable.v1.appTableRecord.delete",
    "bitable.v1.appTableRecord.list",
    "drive.v1.permissionMember.list",
    "drive.v1.permissionMember.create",
    "drive.v1.permissionMember.delete",
    "drive.v1.permissionMember.update",
    "drive.v2.permissionPublic.update"
  ]
}
EOF

# Start with the docs bundle which includes wiki tools
exec bash bundles/start-bundle.sh docs