#!/bin/bash

# 环境变量验证脚本
# 验证 mcp-nft-migration 是否正确读取环境变量

set -e

echo "════════════════════════════════════════════════════════════════"
echo "  MCP NFT Migration - 环境变量验证"
echo "════════════════════════════════════════════════════════════════"
echo ""

# 从 ~/.claude.json 读取配置
CONFIG_FILE="$HOME/.claude.json"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ 错误: 未找到 Claude Code 配置文件: $CONFIG_FILE"
    exit 1
fi

echo "✅ 找到配置文件: $CONFIG_FILE"
echo ""

# 检查 nft-migration 配置是否存在
if ! jq -e '.mcpServers."nft-migration"' "$CONFIG_FILE" > /dev/null 2>&1; then
    echo "❌ 错误: 未找到 nft-migration MCP Server 配置"
    exit 1
fi

echo "✅ nft-migration 配置存在"
echo ""

# 显示所有配置的环境变量
echo "📋 配置的环境变量（共 $(jq '.mcpServers."nft-migration".env | length' "$CONFIG_FILE") 个）："
echo "──────────────────────────────────────────────────────────────"
echo ""

echo "🌐 网络配置："
echo "  NFT_NETWORK_RPC_URL = $(jq -r '.mcpServers."nft-migration".env.NFT_NETWORK_RPC_URL // "N/A"' "$CONFIG_FILE")"
echo "  NFT_NETWORK_CHAIN_ID = $(jq -r '.mcpServers."nft-migration".env.NFT_NETWORK_CHAIN_ID // "N/A"' "$CONFIG_FILE")"
echo "  NFT_NETWORK_NAME = $(jq -r '.mcpServers."nft-migration".env.NFT_NETWORK_NAME // "N/A"' "$CONFIG_FILE")"
echo ""
echo "  VALIDATION_NETWORK_RPC_URL = $(jq -r '.mcpServers."nft-migration".env.VALIDATION_NETWORK_RPC_URL // "N/A"' "$CONFIG_FILE")"
echo "  VALIDATION_NETWORK_CHAIN_ID = $(jq -r '.mcpServers."nft-migration".env.VALIDATION_NETWORK_CHAIN_ID // "N/A"' "$CONFIG_FILE")"
echo "  VALIDATION_NETWORK_NAME = $(jq -r '.mcpServers."nft-migration".env.VALIDATION_NETWORK_NAME // "N/A"' "$CONFIG_FILE")"
echo ""
echo "  FILECOIN_NETWORK_RPC_URL = $(jq -r '.mcpServers."nft-migration".env.FILECOIN_NETWORK_RPC_URL // "N/A"' "$CONFIG_FILE")"
echo "  FILECOIN_NETWORK_CHAIN_ID = $(jq -r '.mcpServers."nft-migration".env.FILECOIN_NETWORK_CHAIN_ID // "N/A"' "$CONFIG_FILE")"
echo "  FILECOIN_NETWORK_NAME = $(jq -r '.mcpServers."nft-migration".env.FILECOIN_NETWORK_NAME // "N/A"' "$CONFIG_FILE")"

echo ""
echo "👛 钱包配置："
PRIVATE_KEY=$(jq -r '.mcpServers."nft-migration".env.PRIVATE_KEY // "N/A"' "$CONFIG_FILE")
VALIDATOR_KEY=$(jq -r '.mcpServers."nft-migration".env.VALIDATOR_PRIVATE_KEY // "N/A"' "$CONFIG_FILE")
if [ "$PRIVATE_KEY" != "N/A" ]; then
    echo "  PRIVATE_KEY = ${PRIVATE_KEY:0:10}...[HIDDEN]"
else
    echo "  PRIVATE_KEY = N/A"
fi
if [ "$VALIDATOR_KEY" != "N/A" ]; then
    echo "  VALIDATOR_PRIVATE_KEY = ${VALIDATOR_KEY:0:10}...[HIDDEN]"
else
    echo "  VALIDATOR_PRIVATE_KEY = N/A"
fi

echo ""
echo "📝 合约配置："
echo "  NFT_CONTRACT_ADDRESS = $(jq -r '.mcpServers."nft-migration".env.NFT_CONTRACT_ADDRESS // "N/A"' "$CONFIG_FILE")"
echo "  AGENT_IDENTITY_ADDRESS = $(jq -r '.mcpServers."nft-migration".env.AGENT_IDENTITY_ADDRESS // "N/A"' "$CONFIG_FILE")"
echo "  AGENT_REPUTATION_ADDRESS = $(jq -r '.mcpServers."nft-migration".env.AGENT_REPUTATION_ADDRESS // "N/A"' "$CONFIG_FILE")"
echo "  AGENT_VALIDATION_ADDRESS = $(jq -r '.mcpServers."nft-migration".env.AGENT_VALIDATION_ADDRESS // "N/A"' "$CONFIG_FILE")"

echo ""
echo "🎯 NFT Token 范围："
echo "  NFT_START_TOKEN_ID = $(jq -r '.mcpServers."nft-migration".env.NFT_START_TOKEN_ID // "N/A"' "$CONFIG_FILE")"
echo "  NFT_END_TOKEN_ID = $(jq -r '.mcpServers."nft-migration".env.NFT_END_TOKEN_ID // "N/A"' "$CONFIG_FILE")"

echo ""
echo "🌍 IPFS 配置："
echo "  IPFS_GATEWAY = $(jq -r '.mcpServers."nft-migration".env.IPFS_GATEWAY // "N/A"' "$CONFIG_FILE")"

echo ""
echo "🔒 代理配置："
HTTP_PROXY=$(jq -r '.mcpServers."nft-migration".env.HTTP_PROXY // "N/A"' "$CONFIG_FILE")
HTTPS_PROXY=$(jq -r '.mcpServers."nft-migration".env.HTTPS_PROXY // "N/A"' "$CONFIG_FILE")
if [ "$HTTP_PROXY" != "N/A" ]; then
    echo "  HTTP_PROXY = [CONFIGURED]"
else
    echo "  HTTP_PROXY = N/A"
fi
if [ "$HTTPS_PROXY" != "N/A" ]; then
    echo "  HTTPS_PROXY = [CONFIGURED]"
else
    echo "  HTTPS_PROXY = N/A"
fi

echo ""
echo "──────────────────────────────────────────────────────────────"

# 检查必需的环境变量
echo ""
echo "✅ 必需变量检查："

REQUIRED_VARS=(
    "NFT_NETWORK_RPC_URL"
    "VALIDATION_NETWORK_RPC_URL"
    "FILECOIN_NETWORK_RPC_URL"
    "PRIVATE_KEY"
    "VALIDATOR_PRIVATE_KEY"
    "NFT_CONTRACT_ADDRESS"
    "AGENT_IDENTITY_ADDRESS"
    "AGENT_VALIDATION_ADDRESS"
)

ALL_CONFIGURED=true
for var in "${REQUIRED_VARS[@]}"; do
    VALUE=$(jq -r ".mcpServers.\"nft-migration\".env.\"$var\" // \"N/A\"" "$CONFIG_FILE")
    if [ "$VALUE" != "N/A" ] && [ -n "$VALUE" ]; then
        echo "  ✅ $var"
    else
        echo "  ❌ $var (缺失)"
        ALL_CONFIGURED=false
    fi
done

echo ""
echo "════════════════════════════════════════════════════════════════"

if [ "$ALL_CONFIGURED" = true ]; then
    echo "✅ 所有必需的环境变量已配置！"
    echo ""
    echo "📌 下一步："
    echo "  1. 重启 Claude Code"
    echo "  2. 运行 /mcp 验证连接"
    echo "  3. 测试 MCP 工具功能"
    echo ""
    echo "💡 提示："
    echo "  - stdio 模式配置文件: $CONFIG_FILE"
    echo "  - 构建输出: $(pwd)/build/"
    echo "  - 日志文件: $(pwd)/logs/"
    exit 0
else
    echo "❌ 部分必需的环境变量未配置"
    echo ""
    echo "请参考文档："
    echo "  - 环境变量同步完成.md"
    echo "  - stdio模式环境变量配置.md"
    exit 1
fi
