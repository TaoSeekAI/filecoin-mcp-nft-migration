# ⚡ NFT 迁移快速参考卡

**一句话流程**: NFT 元数据从以太坊主网 → Filecoin 永久存储 → Sepolia 链上验证

---

## 🚀 7 步完整流程（复制粘贴即可）

### 1️⃣ 验证环境
```
请使用 verify_setup 工具验证环境配置
```

### 2️⃣ 获取 NFT 元数据
```
请使用 get_nft_metadata 获取 Azuki NFT #1 的元数据
合约地址: 0xED5AF388653567Af2F388E6224dC7C4b3241C544
Token ID: 1
```

### 3️⃣ 上传到 Filecoin
```
请使用 upload_to_filecoin 上传 Azuki #1 的元数据到 Filecoin
Token ID: 1
Contract Address: 0xED5AF388653567Af2F388E6224dC7C4b3241C544
Metadata: [从步骤 2 复制元数据]
```

### 4️⃣ 注册 AI Agent
```
请使用 register_agent 在 ERC-8004 注册 AI Agent
Name: NFT Migration Agent
Description: Automated agent for migrating NFT metadata from IPFS to Filecoin
Capabilities: ["nft-scan", "filecoin-upload", "metadata-migration"]
```
**⚠️ 记录返回的 Agent ID！**

### 5️⃣ 创建验证请求
```
请使用 create_validation_request 创建验证请求
Agent ID: [从步骤 4 获取的 Agent ID]
Task Description: NFT metadata migration from IPFS to Filecoin - Azuki #1
NFT Contract: 0xED5AF388653567Af2F388E6224dC7C4b3241C544
Token Range: {"start": 1, "end": 1}
IPFS CIDs: ["QmYDvPAXtiJg7s8JdRBSLWdgSphQdac8j1YuQNNxcGE1hg"]
```
**⚠️ 记录返回的 Request Hash！**

### 6️⃣ 提交验证
```
请使用 submit_validation 提交验证结果
Request Hash: [从步骤 5 获取的 Request Hash]
Is Valid: true
Migration Results: [
  {
    "ipfsCid": "QmYDvPAXtiJg7s8JdRBSLWdgSphQdac8j1YuQNNxcGE1hg",
    "filecoinPieceCid": "[从步骤 3 获取的 PieceCID]",
    "filecoinCarCid": "[从步骤 3 获取的 CarCID]",
    "success": true
  }
]
```

### 7️⃣ 查询验证状态
```
请使用 get_validation_status 查询验证状态
Request Hash: [从步骤 5 获取的 Request Hash]
```

---

## 🔑 关键地址（Sepolia）

```
Identity Registry:    0x7177a6867296406881E20d6647232314736Dd09A
Validation Registry:  0x662b40A526cb4017d947e71eAF6753BF3eeE66d8
```

---

## 🐛 常见错误速查

| 错误 | 原因 | 解决方案 |
|------|------|---------|
| **Not authorized validator** | Validator 地址不匹配 | 查看 `ERC8004_VALIDATOR_SOLUTION.md` |
| **Self-validation detected** | Agent owner = Validator | 使用不同的钱包地址 |
| **RPC 指向错误网络** | 环境变量未加载 | 重启 Claude Code |
| **Socket hang up** | Filecoin 网络不稳定 | 重试或换 RPC 端点 |

---

## ✅ 成功检查清单

- [ ] Step 1: 环境验证通过
- [ ] Step 2: NFT 元数据获取成功
- [ ] Step 3: Filecoin 上传获得 PieceCID
- [ ] Step 4: Agent 注册获得 Agent ID
- [ ] Step 5: 验证请求获得 Request Hash
- [ ] Step 6: 验证提交成功（⚠️ 需要 Validator 配置）
- [ ] Step 7: 验证状态显示 response = 100

**当前状态**: 5/7 步骤可完成（Validator 实施中）

---

## 📊 示例数据（Azuki #1）

```json
{
  "NFT 合约": "0xED5AF388653567Af2F388E6224dC7C4b3241C544",
  "Token ID": 1,
  "IPFS CID": "QmYDvPAXtiJg7s8JdRBSLWdgSphQdac8j1YuQNNxcGE1hg",
  "Filecoin PieceCID": "bafkzcibca3lop7x3ujwuc33le5tl6oexnt3a5g5psa7pg2twd4xrtjlz4ujkgaaa",
  "Agent ID": 144,
  "Request Hash": "0x3a9362046cca907cb2c705fbfa37d2a26524eceaac9b6029f28ece2d97c2ada0"
}
```

---

**快速链接**:
- 完整文档: `NFT_MIGRATION_COMPLETE_GUIDE.md`
- Validator 方案: `ERC8004_VALIDATOR_SOLUTION.md`
- 成功报告: `FINAL_SUCCESS_REPORT.md`
