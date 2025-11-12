# update_agent_metadata MCP Tool 使用指南

## ✅ 工具已添加

成功在 `mcp-nft-migration` MCP 服务器中添加了 `update_agent_metadata` 工具。

## 📋 工具说明

### 功能
通过 ERC-8004 Identity 合约的 `setMetadata` 函数更新 Agent 的 metadata，用于记录 NFT 迁移到 Filecoin 后的信息。

### 输入参数

```typescript
{
  agent_id: string;        // Agent ID (例如: "114")
  metadata: {              // 要更新的 metadata 键值对
    [key: string]: string;
  }
}
```

### 使用示例

#### 示例 1: 记录 Filecoin PieceCID

```json
{
  "agent_id": "114",
  "metadata": {
    "filecoin.pieceCID": "bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4",
    "filecoin.uri": "filecoin://bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4"
  }
}
```

#### 示例 2: 记录完整迁移信息

```json
{
  "agent_id": "114",
  "metadata": {
    "filecoin.pieceCID": "bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4",
    "filecoin.uri": "filecoin://bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4",
    "migration.original_ipfs": "QmZcH4YvBVVRJtdn4RdbaqgspFU8gH6P9vomDpBVpAL3u4",
    "migration.timestamp": "2025-11-11T15:40:00Z",
    "migration.nft_contract": "0xED5AF388653567Af2F388E6224dC7C4b3241C544",
    "migration.nft_token_id": "0",
    "migration.verification_link": "https://pdp.vxb.ai/calibration/piece/bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4"
  }
}
```

## 🔧 工作原理

1. **验证所有权**: 检查当前钱包是否为 Agent 的 owner
2. **批量更新**: 遍历所有提供的 metadata 键值对
3. **链上存储**: 调用 Identity 合约的 `setMetadata` 函数
4. **验证更新**: 读取链上数据验证更新是否成功
5. **返回结果**: 提供详细的交易信息和 Etherscan 链接

## 📊 输出格式

成功时返回:
```markdown
# ✅ Agent Metadata 已更新

**Agent ID**: 114
**Owner**: 0xf3E6B8c07d7369f78e85b1139C81B54710e57846
**更新总数**: 5
**成功**: 5 (100%)
**失败**: 0

## 更新详情

### ✅ filecoin.pieceCID

- **Value**: `bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4`
- **Transaction**: [0xabcd1234...](...link...)
- **Block**: 9607800
- **Gas Used**: 85432

### ✅ filecoin.uri

...

## 🔗 查看 Agent

- [Etherscan Token](https://sepolia.etherscan.io/token/0x7177a6867296406881E20d6647232314736Dd09A?a=114)
- [Etherscan NFT](https://sepolia.etherscan.io/nft/0x7177a6867296406881E20d6647232314736Dd09A/114)

## 🎉 完成！

你的 Agent metadata 已成功更新并记录在 Sepolia 区块链上！
```

## ⚙️ 环境变量要求

需要以下环境变量 (通过 Claude Desktop MCP 配置或 .env 文件):

```bash
# Agent Owner 钱包私钥
PRIVATE_KEY=0x...
# 或者
VALIDATOR_PRIVATE_KEY=0x...

# Ethereum Sepolia RPC URL
ETHEREUM_NETWORK_RPC_URL=https://ethereum-sepolia.publicnode.com
# 或者
VALIDATION_NETWORK_RPC_URL=https://ethereum-sepolia.publicnode.com

# ERC-8004 Identity 合约地址
AGENT_IDENTITY_ADDRESS=0x7177a6867296406881E20d6647232314736Dd09A
```

## 🔐 权限要求

- 必须使用 Agent owner 的钱包私钥
- 非 owner 调用会失败并返回错误信息

## 💡 最佳实践

### Metadata 键命名规范

使用点分隔的层次结构:
```
filecoin.pieceCID
filecoin.uri
migration.original_ipfs
migration.timestamp
migration.nft_contract
migration.nft_token_id
migration.verification_link
validation.request_hash
```

### Gas 优化建议

1. **批量更新**: 一次调用更新多个字段，减少交易次数
2. **短键名**: 使用简洁的键名减少 gas 消耗
3. **必要字段**: 只更新必要的信息，避免重复存储

## 🛠️ 故障排除

### 常见错误

1. **"你不是这个 Agent 的 owner"**
   - 原因: 使用的钱包不是 Agent 的 owner
   - 解决: 确认 `PRIVATE_KEY` 对应 Agent owner 地址

2. **"Metadata 不能为空"**
   - 原因: 没有提供任何 metadata 键值对
   - 解决: 至少提供一个键值对

3. **RPC 连接失败**
   - 原因: RPC URL 不可用
   - 解决: 检查 `ETHEREUM_NETWORK_RPC_URL` 配置

## 🔗 相关资源

- **ERC-8004 setMetadata 完整指南**: [ERC8004_SETMETADATA_GUIDE.md](./ERC8004_SETMETADATA_GUIDE.md)
- **Identity Contract (Sepolia)**: https://sepolia.etherscan.io/address/0x7177a6867296406881E20d6647232314736Dd09A
- **Filecoin Verification**: https://pdp.vxb.ai/calibration/

## 📝 实现细节

### 文件位置
- 源代码: `src/tools/validation.ts` (lines 840-1062)
- 编译输出: `build/tools/validation.js`

### 核心函数
```typescript
async updateAgentMetadata(args: {
  agent_id: string;
  metadata: Record<string, string>;
}): Promise<any>
```

### 依赖项
- `ethers` v6: 用于与 Ethereum 交互
- `@filoz/synapse-sdk`: (间接依赖) 用于 Filecoin 存储

---

**工具添加时间**: 2025-11-11
**MCP 服务器版本**: 1.0.0
**状态**: ✅ 已测试并编译成功
