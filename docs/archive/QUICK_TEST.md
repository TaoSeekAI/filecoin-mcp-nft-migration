# 🚀 快速测试指南

重启 Claude Code Desktop 后，复制以下任意一条命令到对话框：

---

## 🎯 完整流程测试（推荐）

```
请完整演示 NFT 从 IPFS 迁移到 Filecoin 并通过 ERC-8004 验证的全流程：

1. 验证环境配置
2. 获取 Azuki NFT #1 的元数据（合约：0xED5AF388653567Af2F388E6224dC7C4b3241C544）
3. 上传元数据到 Filecoin
4. 注册 AI Agent
5. 创建 ERC-8004 验证请求
6. 提交验证结果
7. 查询验证状态

每个步骤都使用 MCP 工具完成，请显示详细的结果。
```

---

## 🔍 单独测试各个工具

### 测试 1: 验证环境
```
请使用 verify_setup 工具检查 Filecoin 环境配置
```

### 测试 2: 获取 NFT 元数据
```
请使用 get_nft_metadata 工具获取 Azuki NFT #1 的元数据，合约地址是 0xED5AF388653567Af2F388E6224dC7C4b3241C544
```

### 测试 3: 扫描 NFT 合约
```
请使用 nft_scan 工具扫描 Azuki 合约 0xED5AF388653567Af2F388E6224dC7C4b3241C544 的 Token ID 1 和 2
```

### 测试 4: 上传到 Filecoin
```
请使用 upload_to_filecoin 工具上传以下数据：
- Token ID: 1
- 合约: 0xED5AF388653567Af2F388E6224dC7C4b3241C544
- 元数据: {"name":"Azuki #1","image":"ipfs://QmZcH4YvBVVRJtdn4RdbaqgspFU8gH6P9vomDpBVpAL3u4/1"}
```

### 测试 5: 注册 Agent
```
请使用 register_agent 工具注册一个 AI Agent：
- 名称: NFT Migration Agent
- 描述: AI Agent for migrating NFT metadata from IPFS to Filecoin
- 能力: nft_scanning, ipfs_to_filecoin_migration, data_verification
```

---

## ⚡ 直接测试 CLI 脚本（不需要重启）

在终端运行以下命令来验证修复是否成功：

### 测试获取元数据
```bash
cd /Users/harryma/Documents/codes/agentfilecoin/mcp-nft-migration/lib/core
node get-metadata-cli.js 0xED5AF388653567Af2F388E6224dC7C4b3241C544 1
```

### 测试扫描 NFT
```bash
cd /Users/harryma/Documents/codes/agentfilecoin/mcp-nft-migration/lib/core
node scan-nft-cli.js 0xED5AF388653567Af2F388E6224dC7C4b3241C544 1 2
```

---

## 📊 预期输出

### get_nft_metadata 成功输出示例：
```json
{
  "tokenId": "1",
  "contract": "0xED5AF388653567Af2F388E6224dC7C4b3241C544",
  "owner": "0xC8967D1537F7B995607A1DEa2B0C06E18A9756a2",
  "tokenURI": "ipfs://QmZcH4YvBVVRJtdn4RdbaqgspFU8gH6P9vomDpBVpAL3u4/1"
}
```

### nft_scan 成功输出示例：
```json
{
  "contract": "0xED5AF388653567Af2F388E6224dC7C4b3241C544",
  "totalScanned": 2,
  "nfts": [...]
}
```

### upload_to_filecoin 成功输出示例：
```
✅ 上传成功
PieceCID: bafkzcibeq6ad6efazvv2z6exh33vnewy7mma3vg5jdc3lwnvepjqqdjcu464exsnhi
验证链接: https://pdp.vxb.ai/calibration/piece/...
```

---

## 🐛 如果遇到问题

1. **MCP 工具不响应** → 确认已完全重启 Claude Code Desktop
2. **找不到合约** → 检查 NFT_NETWORK_RPC_URL 是否指向主网
3. **上传失败** → 运行 `check_balances` 检查余额
4. **其他错误** → 查看 `WORK_STATUS.md` 的问题排查部分

---

**准备好了就重启 Claude Code Desktop，然后回来复制上面的命令测试吧！** 🎉
