# 💬 NFT 迁移对话指南

**目标**: 通过复制粘贴以下对话，在 Claude Desktop 中完成 NFT 从 IPFS 到 Filecoin 的迁移。

**预计时间**: 5-10 分钟

---

## ⚠️ 开始前准备

### 1. 确保环境配置完成

- ✅ 已安装依赖 (`npm install && npm run build`)
- ✅ 已配置 `.env` 文件（两个不同的私钥）
- ✅ 已配置 Claude Desktop MCP 服务器
- ✅ 已重启 Claude Desktop（看到 🔨 图标）

### 2. 准备钱包

- **Sepolia Testnet**: Agent Owner 和 Validator 各需要 ~0.05 ETH
- **Filecoin Calibration**: 需要 FIL 余额和 USDFC 余额

---

## 📝 完整对话流程（7 步）

### 步骤 1️⃣: 验证环境

```
请使用 verify_setup 工具验证环境配置
```

**期望输出**:
```
✅ 所有检查通过！
- FIL Balance: 104.99 FIL
- USDFC (Payments): 14.93 USDFC
```

---

### 步骤 2️⃣: 获取 NFT 元数据

```
请使用 get_nft_metadata 获取 Azuki NFT #1 的元数据
合约地址: 0xED5AF388653567Af2F388E6224dC7C4b3241C544
Token ID: 1
```

**期望输出**:
```
✅ NFT 元数据获取成功
Token URI: ipfs://QmZcH4YvBVVRJtdn4RdbaqgspFU8gH6P9vomDpBVpAL3u4/1
```

> **注意**: 如果 IPFS 获取超时，Claude 会使用测试元数据继续流程。

---

### 步骤 3️⃣: 上传到 Filecoin

```
请使用 upload_to_filecoin 上传 Azuki #1 的元数据到 Filecoin
Token ID: 1
Contract Address: 0xED5AF388653567Af2F388E6224dC7C4b3241C544
Metadata: {"name": "Azuki #1", "image": "ipfs://QmYDvPAXtiJg7s8JdRBSLWdgSphQdac8j1YuQNNxcGE1hg", "attributes": [{"trait_type": "Type", "value": "Human"}]}
```

**期望输出**:
```
✅ 上传成功！
PieceCID: bafkzcibercat6ee3posayelnzyz7wey7kvacjrsgvylz5g6aazbififemfgymllpaq
Piece ID: 3
Data Set ID: 426
```

> **重要**: 记录 PieceCID，后续步骤需要使用。

---

### 步骤 4️⃣: 注册 AI Agent

```
请使用 register_agent 在 ERC-8004 注册 AI Agent
Name: NFT Migration Agent
Description: Automated agent for migrating NFT metadata from IPFS to Filecoin
Capabilities: ["nft-scan", "filecoin-upload", "metadata-migration"]
```

**期望输出**:
```
✅ Agent 注册成功!
Agent ID (Token ID): 145
Transaction: 0xca0fb40...
```

> **重要**: 记录 Agent ID，后续步骤需要使用。

---

### 步骤 5️⃣: 创建验证请求

```
请使用 create_validation_request 创建验证请求
Agent ID: 145
Task Description: NFT metadata migration from IPFS to Filecoin - Azuki #1
NFT Contract: 0xED5AF388653567Af2F388E6224dC7C4b3241C544
Token Range: {"start": 1, "end": 1}
IPFS CIDs: ["QmYDvPAXtiJg7s8JdRBSLWdgSphQdac8j1YuQNNxcGE1hg"]
```

**期望输出**:
```
✅ 验证请求已创建
Request Hash: 0x9a9b3bd133a72c8685ee0d0fdee3d3a1ef125bfc07793bcaada757046ee4b203
Transaction: 0xd5dad2d...
```

> **重要**: 记录 Request Hash，下一步需要使用。

---

### 步骤 6️⃣: 提交验证结果

```
请使用 submit_validation 提交验证结果
Request Hash: 0x9a9b3bd133a72c8685ee0d0fdee3d3a1ef125bfc07793bcaada757046ee4b203
Is Valid: true
Migration Results: [
  {
    "ipfsCid": "QmYDvPAXtiJg7s8JdRBSLWdgSphQdac8j1YuQNNxcGE1hg",
    "filecoinPieceCid": "bafkzcibercat6ee3posayelnzyz7wey7kvacjrsgvylz5g6aazbififemfgymllpaq",
    "success": true
  }
]
```

**期望输出**:
```
✅ 验证结果已提交
Transaction: 0x1a2e812b...
Success Rate: 100%
```

---

### 步骤 7️⃣: 查询验证状态

```
请查询验证状态
Request Hash: 0x9a9b3bd133a72c8685ee0d0fdee3d3a1ef125bfc07793bcaada757046ee4b203
```

**期望输出**:
```
✅ 验证状态查询结果:
Validator Address: 0xf3E6B8c07d7369f78e85b1139C81B54710e57846
Agent ID: 145
Response: 100 ✅ (100 = Valid)
```

---

## 🎉 完成！

### 验证结果

- **Response = 100**: 验证完全通过 ✅
- **链上记录**: 所有操作已记录在 Sepolia 测试网
- **Filecoin 存储**: NFT 元数据已永久存储在 Filecoin

### 查看链上记录

访问 Sepolia Etherscan 查看交易：
- Agent 注册: `https://sepolia.etherscan.io/tx/[你的交易哈希]`
- 验证请求: `https://sepolia.etherscan.io/tx/[你的交易哈希]`
- 验证提交: `https://sepolia.etherscan.io/tx/[你的交易哈希]`

---

## 🔧 常见问题

### Q1: "Not authorized validator" 错误

**原因**: Validator 地址配置错误

**解决**:
1. 检查 `.env` 中 `PRIVATE_KEY` 和 `VALIDATOR_PRIVATE_KEY` 是否不同
2. 重新创建验证请求（步骤 5）
3. 使用新的 Request Hash 提交验证

### Q2: Filecoin 上传超时

**原因**: 网络不稳定

**解决**: 重试或更换 RPC 端点

### Q3: IPFS 元数据获取失败

**原因**: IPFS 网关不稳定

**解决**: Claude 会自动使用测试元数据继续流程

---

## 🎯 下一步

### 批量迁移

迁移多个 NFT:

```
请使用 nft_scan 扫描 Azuki 合约的前 10 个 NFT
Contract Address: 0xED5AF388653567Af2F388E6224dC7C4b3241C544
Token IDs: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
```

### 自定义 NFT

迁移你自己的 NFT 项目：

```
请上传我的 NFT 到 Filecoin
Contract Address: [你的合约地址]
Token ID: [Token ID]
Metadata: [元数据 JSON]
```

---

## 📚 参考资料

- **项目文档**: [README.md](./README.md)
- **ERC-8004**: https://github.com/ethereum/ERCs/pull/8004
- **Filecoin Synapse**: https://docs.synapse.filoz.io/

---

**最后更新**: 2025-11-12
