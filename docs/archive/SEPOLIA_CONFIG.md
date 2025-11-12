# ✅ Sepolia 测试网正确配置 (已验证)

**测试日期**: 2025-11-11
**测试状态**: ✅ 通过

---

## 📡 网络配置

### ✅ 推荐使用 (已测试可用)

```bash
# Sepolia RPC URL
ETHEREUM_NETWORK_RPC_URL=https://ethereum-sepolia.publicnode.com
VALIDATION_NETWORK_RPC_URL=https://ethereum-sepolia.publicnode.com

# Chain ID
CHAIN_ID=11155111
```

**测试结果**:
- ✅ 连接成功
- ✅ 当前区块: 9607721
- ✅ 响应速度: 快
- ✅ 稳定性: 良好

### ❌ 不可用的 RPC

| RPC URL | 状态 | 原因 |
|---------|------|------|
| `https://eth-sepolia.public.blastapi.io` | ❌ 不可用 | 服务已关闭，建议使用 Alchemy |
| `https://rpc.sepolia.org` | ❌ 不可用 | 连接超时 (522错误) |
| `https://rpc2.sepolia.org` | ❌ 不可用 | 连接超时 |

---

## 📜 ERC-8004 合约地址 (Sepolia)

```bash
# Agent Identity Contract (ERC-721)
AGENT_IDENTITY_ADDRESS=0x7177a6867296406881E20d6647232314736Dd09A

# Agent Validation Contract
AGENT_VALIDATION_ADDRESS=0x662b40A526cb4017d947e71eAF6753BF3eeE66d8

# Agent Reputation Contract
AGENT_REPUTATION_ADDRESS=0xB5048e3ef1DA4E04deB6f7d0423D06F63869e322
```

**验证状态**:
- ✅ 合约已部署
- ✅ 代码长度: 13770 字节
- ✅ Etherscan: [查看合约](https://sepolia.etherscan.io/address/0x7177a6867296406881E20d6647232314736Dd09A)

**合约来源**: [ChaosChain/trustless-agents-erc-ri](https://github.com/ChaosChain/trustless-agents-erc-ri)

---

## 👛 钱包配置

### 环境变量

```bash
# 主钱包私钥 (用于 Filecoin 和通用操作)
PRIVATE_KEY=0x...

# 验证者私钥 (用于 ERC-8004 验证，可以与主钱包相同)
VALIDATOR_PRIVATE_KEY=0x...
```

### 获取测试 ETH

需要 Sepolia ETH 来支付 gas费用（注册 Agent、创建验证请求等）。

**水龙头地址**:
- 🚰 https://sepoliafaucet.com/
- 🚰 https://sepolia-faucet.pk910.de/
- 🚰 https://www.alchemy.com/faucets/ethereum-sepolia

**建议余额**: 至少 0.01 ETH

---

## 🔧 应用配置到系统

### 1. 更新 .env 文件

`.env` 文件已自动更新为正确配置。

### 2. 更新 Claude Desktop 配置

编辑 `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "nft-migration": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-nft-migration/build/index.js"],
      "env": {
        "PRIVATE_KEY": "0x...",
        "WALLET_ADDRESS": "0x...",
        "ETHEREUM_NETWORK_RPC_URL": "https://ethereum-sepolia.publicnode.com",
        "VALIDATION_NETWORK_RPC_URL": "https://ethereum-sepolia.publicnode.com",
        "FILECOIN_NETWORK_RPC_URL": "https://api.calibration.node.glif.io/rpc/v1",
        "ETHEREUM_MAINNET_RPC_URL": "https://eth.llamarpc.com",
        "AGENT_IDENTITY_ADDRESS": "0x7177a6867296406881E20d6647232314736Dd09A",
        "AGENT_VALIDATION_ADDRESS": "0x662b40A526cb4017d947e71eAF6753BF3eeE66d8",
        "AGENT_REPUTATION_ADDRESS": "0xB5048e3ef1DA4E04deB6f7d0423D06F63869e322"
      }
    }
  }
}
```

### 3. 重新构建和重启

```bash
# 重新构建
npm run build

# 完全退出并重启 Claude Code Desktop
```

---

## ✅ 验证配置

运行测试脚本验证配置：

```bash
node test-sepolia-config.js
```

**预期输出**:
```
✅ 使用 RPC: PublicNode (https://ethereum-sepolia.publicnode.com)
✅ 合约已部署
✅ 钱包地址: 0x...
✅ Sepolia ETH 余额: X.XX ETH
```

---

## 📚 相关链接

- **Sepolia Etherscan**: https://sepolia.etherscan.io/
- **ERC-8004 Contracts**: https://github.com/ChaosChain/trustless-agents-erc-ri
- **Sepolia Faucet**: https://sepoliafaucet.com/
- **Alchemy RPC**: https://alchemy.com/ (备用选项)

---

## 🎯 下一步

配置完成后，可以开始使用 ERC-8004 验证功能：

1. ✅ 注册 AI Agent
2. ✅ 创建验证请求
3. ✅ 提交验证结果
4. ✅ 查询验证状态

**MCP 工具**:
- `register_agent` - 注册 Agent
- `create_validation_request` - 创建验证请求
- `submit_validation` - 提交验证结果
- `get_validation_status` - 查询状态

---

**测试完成时间**: 2025-11-11 15:12 UTC
