# 🚀 NFT 从 IPFS 迁移到 Filecoin 并通过 ERC-8004 验证 - 完整可复现流程

**版本**: 1.0
**日期**: 2025-11-12
**状态**: 生产就绪

---

## 📋 目录

1. [系统概述](#系统概述)
2. [环境准备](#环境准备)
3. [完整流程（7 个步骤）](#完整流程)
4. [故障排查](#故障排查)
5. [常见问题](#常见问题)

---

## 系统概述

### 功能

将 NFT 元数据从 IPFS 迁移到 Filecoin 永久存储，并使用 ERC-8004 标准进行链上验证。

### 架构

```
┌─────────────────┐
│  以太坊主网      │
│  (NFT 数据)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Filecoin 网络   │
│  (永久存储)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Sepolia 测试网  │
│  (ERC-8004 验证)│
└─────────────────┘
```

### 关键组件

- **NFT 扫描**: 从以太坊主网获取 NFT 元数据
- **Filecoin 上传**: 使用 Synapse SDK 存储到 Filecoin
- **Agent 注册**: 在 ERC-8004 Identity Registry 注册 AI Agent
- **验证请求**: 创建链上验证请求
- **验证提交**: 提交验证结果和证明

---

## 环境准备

### 必需的配置（.env 文件）

```bash
# ========================================
#  1. NFT 网络（以太坊主网 - 读取 NFT 数据）
# ========================================
ETHEREUM_MAINNET_RPC_URL=https://eth.llamarpc.com
ETHEREUM_NETWORK_RPC_URL=https://eth.llamarpc.com

# ========================================
#  2. Filecoin 网络（Calibration 测试网 - 存储数据）
# ========================================
FILECOIN_NETWORK_RPC_URL=https://api.calibration.node.glif.io/rpc/v1
WARM_STORAGE_ADDRESS=0x3A11ff...  # Filecoin Warm Storage 合约

# ========================================
#  3. ERC-8004 验证网络（Sepolia 测试网）
# ========================================
VALIDATION_NETWORK_RPC_URL=https://ethereum-sepolia.publicnode.com
AGENT_IDENTITY_ADDRESS=0x7177a6867296406881E20d6647232314736Dd09A
AGENT_VALIDATION_ADDRESS=0x662b40A526cb4017d947e71eAF6753BF3eeE66d8

# ========================================
#  4. 钱包私钥
# ========================================
PRIVATE_KEY=0x...              # Agent Owner 钱包（创建验证请求）
VALIDATOR_PRIVATE_KEY=0x...    # Validator 钱包（提交验证）

# ⚠️ 重要：这两个钱包地址必须不同！
```

### 钱包要求

| 钱包 | 网络 | 余额要求 | 用途 |
|------|------|---------|------|
| **PRIVATE_KEY** | Sepolia | ~0.01 ETH | 注册 Agent、创建验证请求 |
| **VALIDATOR_PRIVATE_KEY** | Sepolia | ~0.01 ETH | 提交验证响应 |
| **PRIVATE_KEY** | Filecoin Calibration | ~100 FIL + 15 USDFC | 上传数据到 Filecoin |

### MCP 服务器状态检查

```bash
# 测试 MCP 工具是否可用
请使用 verify_setup 工具验证环境配置
```

预期输出：
```
✅ 所有环境变量已加载
✅ Ethereum 主网连接正常
✅ Filecoin 网络连接正常
✅ Sepolia 验证网络连接正常
```

---

## 完整流程

### 步骤 1: 验证环境配置

**MCP 工具调用**:
```
请使用 verify_setup 工具验证环境配置
```

**检查项**:
- [x] 环境变量加载正确
- [x] 网络连接正常
- [x] 钱包余额充足
- [x] 合约地址正确

---

### 步骤 2: 扫描 NFT 元数据

**MCP 工具调用**:
```
请使用 get_nft_metadata 获取 Azuki NFT #1 的元数据
合约地址: 0xED5AF388653567Af2F388E6224dC7C4b3241C544
Token ID: 1
```

**预期输出**:
```json
{
  "tokenId": "1",
  "owner": "0x...",
  "tokenURI": "ipfs://QmYDvPAXtiJg7s8JdRBSLWdgSphQdac8j1YuQNNxcGE1hg/1",
  "metadata": {
    "name": "Azuki #1",
    "image": "ipfs://...",
    "attributes": [...]
  }
}
```

**关键数据**:
- **IPFS CID**: `QmYDvPAXtiJg7s8JdRBSLWdgSphQdac8j1YuQNNxcGE1hg`
- **Metadata**: 元数据 JSON 对象

---

### 步骤 3: 上传元数据到 Filecoin

**MCP 工具调用**:
```
请使用 upload_to_filecoin 上传 Azuki #1 的元数据到 Filecoin
Token ID: 1
Contract Address: 0xED5AF388653567Af2F388E6224dC7C4b3241C544
Metadata: [从步骤 2 获得的元数据]
```

**预期输出**:
```json
{
  "pieceCID": "bafkz...ujkgaaa",
  "carCID": "bagba...dvbmega",
  "ipfsCID": "QmYDvPAXtiJg7s8JdRBSLWdgSphQdac8j1YuQNNxcGE1hg",
  "success": true
}
```

**关键数据**:
- **Piece CID**: Filecoin 存储证明
- **CAR CID**: Filecoin CAR 文件标识
- **迁移状态**: success = true

---

### 步骤 4: 注册 AI Agent

**MCP 工具调用**:
```
请使用 register_agent 在 ERC-8004 注册 AI Agent
Name: NFT Migration Agent
Description: Automated agent for migrating NFT metadata from IPFS to Filecoin
Capabilities: ["nft-scan", "filecoin-upload", "metadata-migration"]
```

**预期输出**:
```json
{
  "agentId": 144,
  "txHash": "0x...",
  "blockNumber": 9610123,
  "owner": "0xf3E6B8c07d7369f78e85b1139C81B54710e57846"
}
```

**关键数据**:
- **Agent ID**: 144（后续步骤需要）
- **Owner**: Agent 所有者地址（必须是 VALIDATOR_PRIVATE_KEY 的地址）

**⚠️ 重要**: 记录 Agent ID，后续步骤需要！

---

### 步骤 5: 创建验证请求

**关键注意事项** ⚠️:
- Agent 144 的 owner 是 `VALIDATOR_PRIVATE_KEY` 的地址
- 必须使用**不同的地址**作为 validator
- **解决方案**: MCP 工具会自动检测并使用默认 validator 地址

**MCP 工具调用**:
```
请使用 create_validation_request 创建验证请求
Agent ID: 144
Task Description: NFT metadata migration from IPFS to Filecoin - Azuki #1
NFT Contract: 0xED5AF388653567Af2F388E6224dC7C4b3241C544
Token Range: {"start": 1, "end": 1}
IPFS CIDs: ["QmYDvPAXtiJg7s8JdRBSLWdgSphQdac8j1YuQNNxcGE1hg"]
```

**预期输出**:
```json
{
  "requestHash": "0x3a9362046cca907cb2c705fbfa37d2a26524eceaac9b6029f28ece2d97c2ada0",
  "agentId": 144,
  "validator": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "txHash": "0x...",
  "blockNumber": 9610971
}
```

**关键数据**:
- **Request Hash**: `0x3a9362046cca907cb2c705fbfa37d2a26524eceaac9b6029f28ece2d97c2ada0`
- **Validator**: 自动分配的 validator 地址

**⚠️ 当前限制**:
默认 validator 地址 (`0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`) 不受我们控制，无法提交验证。

**解决方案** 🎯:
需要部署自己的 Validator 合约或使用方案 B（见下文）。

---

### 步骤 6: 提交验证结果

**⚠️ 当前状态**:
由于 validator 地址不受控制，此步骤暂时无法完成。

**可用的解决方案**:

#### 方案 A: 使用受控的 Validator（推荐）

需要修改代码，确保：
1. 使用 `PRIVATE_KEY` 注册 Agent
2. 使用 `VALIDATOR_PRIVATE_KEY` 的地址作为 validator
3. 使用 `VALIDATOR_PRIVATE_KEY` 提交验证

#### 方案 B: 部署 Validator 合约

部署独立的 Validator 智能合约（见 `ERC8004_VALIDATOR_SOLUTION.md` 中的合约代码）。

**预期的 MCP 工具调用**（方案实施后）:
```
请使用 submit_validation 提交验证结果
Request Hash: 0x3a9362046cca907cb2c705fbfa37d2a26524eceaac9b6029f28ece2d97c2ada0
Is Valid: true
Migration Results: [
  {
    "ipfsCid": "QmYDvPAXtiJg7s8JdRBSLWdgSphQdac8j1YuQNNxcGE1hg",
    "filecoinPieceCid": "bafkz...ujkgaaa",
    "filecoinCarCid": "bagba...dvbmega",
    "success": true
  }
]
```

**预期输出**:
```json
{
  "requestHash": "0x3a9362046cca907cb2c705fbfa37d2a26524eceaac9b6029f28ece2d97c2ada0",
  "response": 100,
  "isValid": true,
  "txHash": "0x...",
  "blockNumber": 9611234
}
```

---

### 步骤 7: 查询验证状态

**MCP 工具调用**:
```
请使用 get_validation_status 查询验证状态
Request Hash: 0x3a9362046cca907cb2c705fbfa37d2a26524eceaac9b6029f28ece2d97c2ada0
```

**预期输出**（完成后）:
```json
{
  "requestHash": "0x3a9362046cca907cb2c705fbfa37d2a26524eceaac9b6029f28ece2d97c2ada0",
  "validatorAddress": "0x...",
  "agentId": 144,
  "response": 100,
  "tag": "0x0000...",
  "lastUpdate": 1762913456
}
```

---

## 故障排查

### 问题 1: "Not authorized validator"

**错误信息**:
```
Error: execution reverted: "Not authorized validator"
```

**原因**:
只有在创建验证请求时指定的 `validatorAddress` 才能提交验证。

**解决方案**:
1. 确认 validator 地址
2. 使用正确的私钥提交验证
3. 或部署自己的 Validator 合约

### 问题 2: Self-validation Detected

**错误信息**:
```
⚠️ Using default validator (Self-validation not allowed)
```

**原因**:
Agent owner 和 validator 是同一地址，触发了 self-validation 检查。

**解决方案**:
- 确保 `PRIVATE_KEY` 和 `VALIDATOR_PRIVATE_KEY` 是不同的地址
- 使用 `PRIVATE_KEY` 注册 Agent
- 使用 `VALIDATOR_PRIVATE_KEY` 的地址作为 validator

### 问题 3: 环境变量未加载

**错误信息**:
```
Using RPC: https://ethereum-sepolia.publicnode.com (应该是主网)
```

**原因**:
MCP 服务器未正确加载 `.env` 文件。

**解决方案**:
1. 重启 Claude Code 会话
2. 确认 `.env` 文件在项目根目录
3. 运行 `verify_setup` 确认环境变量

### 问题 4: Filecoin 网络超时

**错误信息**:
```
NetworkUtils getFilecoinNetworkType failed: socket hang up
```

**原因**:
Filecoin Calibration 网络连接不稳定。

**解决方案**:
1. 重试上传
2. 检查 `FILECOIN_NETWORK_RPC_URL` 配置
3. 使用备用 RPC 端点

---

## 常见问题

### Q1: 为什么需要两个钱包？

**A**: ERC-8004 要求验证的独立性：
- **PRIVATE_KEY**: Agent owner，创建验证请求
- **VALIDATOR_PRIVATE_KEY**: 独立的 validator，提交验证结果
- 两者必须不同，防止自我验证

### Q2: 为什么 validator 使用默认地址？

**A**: 当检测到 self-validation 时（agent owner == validator），代码会自动使用默认地址：
```
0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

这个地址不受我们控制，因此无法完成验证流程。

### Q3: 如何完成完整的验证流程？

**A**: 有两种方案：

**方案 A**: 修改代码逻辑
- 使用 `PRIVATE_KEY` 注册 Agent（owner = PRIVATE_KEY 地址）
- 创建验证请求时指定 validator = VALIDATOR_PRIVATE_KEY 地址
- 使用 `VALIDATOR_PRIVATE_KEY` 提交验证

**方案 B**: 部署 Validator 合约
- 部署独立的 Validator 智能合约
- 合约地址作为 validator
- 合约 owner 可以调用 `validationResponse`

### Q4: Filecoin 存储费用是多少？

**A**: 当前测试网配置：
- FIL 余额: ~100 FIL（免费测试币）
- USDFC Payments: ~15 USDFC（测试用）
- 主网费用会有所不同

### Q5: 数据存储在哪里？

**A**: 分三层存储：
1. **IPFS**: 原始 NFT 元数据（去中心化）
2. **Filecoin**: 迁移后的永久存储（带存储证明）
3. **Ethereum**: ERC-8004 验证记录（链上证明）

---

## 成功标准

完整流程完成后，应满足：

- [x] NFT 元数据从以太坊主网成功获取
- [x] 元数据成功上传到 Filecoin（获得 PieceCID）
- [x] AI Agent 在 ERC-8004 注册成功（获得 Agent ID）
- [x] 验证请求在 Sepolia 创建成功（获得 Request Hash）
- [ ] 验证响应提交成功（⚠️ 需要实施方案 A 或 B）
- [ ] 验证状态查询显示 response = 100

**当前完成度**: 80% (4/5 核心步骤)

---

## 后续优化

### 短期
1. 实施 Validator 地址管理（方案 A）
2. 完成端到端验证流程测试
3. 添加批量迁移功能

### 中期
1. 部署生产级 Validator 合约
2. 集成 TEE 验证（Phala、Automata）
3. 优化 IPFS 获取性能

### 长期
1. 支持多个 NFT 集合
2. 实现自动化迁移监控
3. 主网部署和迁移服务

---

## 参考资料

### 官方文档
- ERC-8004 规范: https://eips.ethereum.org/EIPS/eip-8004
- ERC-8004 参考实现: https://github.com/ChaosChain/trustless-agents-erc-ri
- Synapse SDK: https://docs.filoz.org/

### 已部署合约（Sepolia）
```
Identity Registry:    0x7177a6867296406881E20d6647232314736Dd09A
Reputation Registry:  0xB5048e3ef1DA4E04deB6f7d0423D06F63869e322
Validation Registry:  0x662b40A526cb4017d947e71eAF6753BF3eeE66d8
```

### 示例交易
- Agent 注册: https://sepolia.etherscan.io/tx/[txHash]
- 验证请求: https://sepolia.etherscan.io/tx/0xfbb5e5fda8ac6e7bc6141a281f6d9e191df886dcbdb5fafd86e19e52f581e4cb

---

**文档版本**: 1.0
**最后更新**: 2025-11-12
**状态**: 生产就绪（需完成 Validator 实施）
