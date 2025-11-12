# ERC-8004 setMetadata 完整使用指南

**目的**: 通过 ERC-8004 Identity 合约的 `setMetadata` 功能记录 NFT 迁移到 Filecoin 的信息

---

## 🎯 核心概念

### ERC-8004 Agent 的两种 URI

| URI 类型 | 用途 | 设置方式 | 可修改性 |
|---------|------|---------|---------|
| **tokenURI** | Agent 的主 URI (ERC-721 标准) | 注册时设置 | 不可修改 |
| **metadata** | Agent 的扩展 metadata (键值对) | `setMetadata` 设置 | ✅ 可修改 |

### setMetadata 函数

```solidity
function setMetadata(
    uint256 agentId,     // Agent ID
    string key,          // Metadata 键名
    bytes value          // Metadata 值 (bytes 格式)
) external
```

**权限**: 只有 Agent owner 可以调用

**事件**:
```solidity
event MetadataSet(
    uint256 indexed agentId,
    string indexed indexedKey,
    string key,
    bytes value
)
```

---

## 📋 完整工作流程

### Phase 1: NFT 迁移 (已完成 ✅)

```bash
# 1. NFT metadata 已上传到 Filecoin
原始 IPFS: QmZcH4YvBVVRJtdn4RdbaqgspFU8gH6P9vomDpBVpAL3u4
Filecoin PieceCID: bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4

# 2. Agent 已注册
Agent ID: 114
Owner: 0xf3E6B8c07d7369f78e85b1139C81B54710e57846
```

### Phase 2: 使用 setMetadata 记录迁移信息

#### 方式 A: 使用 Etherscan (推荐 - 最简单)

1. **访问 Identity 合约**:
   https://sepolia.etherscan.io/address/0x7177a6867296406881E20d6647232314736Dd09A#writeContract

2. **连接钱包**:
   - 点击 "Connect to Web3"
   - 连接你的 MetaMask (Agent owner 钱包)

3. **调用 setMetadata**:
   ```
   Function: setMetadata

   agentId (uint256): 114

   key (string): filecoin.pieceCID

   value (bytes): 0x626166...  (见下方转换工具)
   ```

4. **推荐的 Metadata 键值对**:

   | key | value (string, 需转换为 bytes) |
   |-----|-------------------------------|
   | `filecoin.pieceCID` | `bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4` |
   | `filecoin.uri` | `filecoin://bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4` |
   | `migration.original_ipfs` | `QmZcH4YvBVVRJtdn4RdbaqgspFU8gH6P9vomDpBVpAL3u4` |
   | `migration.timestamp` | `2025-11-11T15:40:00Z` |
   | `migration.nft_contract` | `0xED5AF388653567Af2F388E6224dC7C4b3241C544` |
   | `migration.nft_token_id` | `0` |
   | `migration.verification_link` | `https://pdp.vxb.ai/calibration/piece/...` |

5. **String 转 Bytes 工具**:
   - 在线工具: https://web3-tools.xyz/text-to-hex-converter
   - 或使用浏览器控制台:
     ```javascript
     ethers.toUtf8Bytes("你的字符串")
     ```

#### 方式 B: 使用 ethers.js 脚本

```javascript
import { ethers } from 'ethers';

// 连接钱包
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// 合约实例
const identityContract = new ethers.Contract(
  '0x7177a6867296406881E20d6647232314736Dd09A',
  [
    'function setMetadata(uint256 agentId, string key, bytes value) external',
    'function getMetadata(uint256 agentId, string key) external view returns (bytes)'
  ],
  signer
);

// 设置 metadata
const agentId = 114;
const key = 'filecoin.pieceCID';
const value = 'bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4';

const tx = await identityContract.setMetadata(
  agentId,
  key,
  ethers.toUtf8Bytes(value)
);

console.log('Transaction:', tx.hash);
await tx.wait();
console.log('✅ Metadata updated!');

// 读取验证
const stored = await identityContract.getMetadata(agentId, key);
console.log('Stored value:', ethers.toUtf8String(stored));
```

#### 方式 C: 使用 MCP 工具 (开发中)

```bash
# 未来将支持:
npx mcp-nft-migration update_agent_metadata \
  --agent-id 114 \
  --key "filecoin.pieceCID" \
  --value "bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4"
```

---

## 🔍 读取和验证

### 方法 1: Etherscan Read Contract

1. 访问: https://sepolia.etherscan.io/address/0x7177a6867296406881E20d6647232314736Dd09A#readContract

2. 调用 `getMetadata`:
   ```
   agentId: 114
   key: filecoin.pieceCID
   ```

3. 结果是 bytes，需要转换回字符串:
   - 使用: https://web3-tools.xyz/hex-to-text-converter
   - 或浏览器控制台: `ethers.toUtf8String("0x...")`

### 方法 2: ethers.js

```javascript
const metadata = await identityContract.getMetadata(114, 'filecoin.pieceCID');
const decodedValue = ethers.toUtf8String(metadata);
console.log('Filecoin PieceCID:', decodedValue);
```

### 方法 3: Subgraph 查询 (如果可用)

```graphql
query {
  agent(id: "114") {
    id
    owner
    tokenURI
    metadata {
      key
      value
    }
  }
}
```

---

## 📊 完整示例：记录完整的迁移信息

### 单笔交易 - 完整 JSON metadata

如果想在单笔交易中记录所有信息，可以使用一个键存储完整的 JSON:

```javascript
const migrationData = {
  taskType: 'NFT IPFS to Filecoin Migration',
  nft: {
    contract: '0xED5AF388653567Af2F388E6224dC7C4b3241C544',
    tokenId: '0',
    name: 'Azuki #0',
    owner: '0x2aE6B0630EBb4D155C6e04fCB16840FFA77760AA'
  },
  migration: {
    originalIPFS: 'QmZcH4YvBVVRJtdn4RdbaqgspFU8gH6P9vomDpBVpAL3u4',
    filecoinPieceCID: 'bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4',
    filecoinURI: 'filecoin://bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4',
    verificationLink: 'https://pdp.vxb.ai/calibration/piece/bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4',
    status: 'completed',
    timestamp: '2025-11-11T15:40:00Z'
  },
  agent: {
    id: 114,
    validationRequestHash: '0x44284B8BC1D2C35AA15664964367AB139B7A447DB27D56C3D450E748EA94AA5B'
  }
};

// 单笔交易存储
const tx = await identityContract.setMetadata(
  114,
  'migration.complete',
  ethers.toUtf8Bytes(JSON.stringify(migrationData))
);
```

### 多笔交易 - 分离的键值对 (推荐)

```javascript
const metadataEntries = [
  ['filecoin.pieceCID', 'bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4'],
  ['filecoin.uri', 'filecoin://bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4'],
  ['migration.original_ipfs', 'QmZcH4YvBVVRJtdn4RdbaqgspFU8gH6P9vomDpBVpAL3u4'],
  ['migration.nft_contract', '0xED5AF388653567Af2F388E6224dC7C4b3241C544'],
  ['migration.nft_token_id', '0'],
  ['migration.status', 'completed'],
  ['migration.timestamp', new Date().toISOString()],
];

for (const [key, value] of metadataEntries) {
  const tx = await identityContract.setMetadata(
    114,
    key,
    ethers.toUtf8Bytes(value)
  );
  console.log(`✅ ${key} updated: ${tx.hash}`);
  await tx.wait();
}
```

---

## 💡 最佳实践

### 1. Metadata 键命名规范

使用点分隔的层次结构:
```
filecoin.pieceCID
filecoin.uri
migration.original_ipfs
migration.timestamp
migration.nft_contract
migration.nft_token_id
validation.request_hash
validation.status
```

### 2. 数据格式

- **字符串**: 直接存储
- **数字**: 转换为字符串
- **JSON**: `JSON.stringify()` 后存储
- **地址**: 保持原格式 (0x...)

### 3. Gas 优化

- 短键名: ✅ `fc.cid` vs ❌ `filecoin.pieceCID.full.version`
- 批量更新: 考虑使用一个键存储 JSON
- 只更新必要字段: 不要重复存储相同信息

### 4. 可查询性

- 使用一致的键名规范
- 考虑创建 metadata 索引文档
- 重要字段使用单独的键 (便于查询)

---

## 🔗 相关链接

- **Identity Contract (Sepolia)**: https://sepolia.etherscan.io/address/0x7177a6867296406881E20d6647232314736Dd09A
- **你的 Agent**: https://sepolia.etherscan.io/token/0x7177a6867296406881E20d6647232314736Dd09A?a=114
- **Filecoin Verification**: https://pdp.vxb.ai/calibration/piece/bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4

---

## 📝 总结

### ✅ 优势

1. **灵活性**: 可以随时添加新的 metadata
2. **可扩展**: 支持任意键值对
3. **链上**: 永久存储，可验证
4. **权限控制**: 只有 owner 可以修改
5. **成本低**: 比更新整个 tokenURI 便宜

### ⚠️ 注意事项

1. 每次 setMetadata 需要单独的交易
2. 需要转换字符串为 bytes 格式
3. 读取时需要转换 bytes 回字符串
4. Metadata 不在标准 ERC-721 tokenURI 中

### 🎯 推荐方案

**对于你的场景 (Azuki #0 迁移)**:

1. ✅ 使用 Etherscan Write Contract 功能
2. ✅ 设置 3-5 个关键 metadata 字段
3. ✅ 记录 Filecoin PieceCID 和验证链接
4. ⏳ (可选) 配置第二个验证者钱包完成 ERC-8004 验证

**快速开始**:
1. 打开: https://sepolia.etherscan.io/address/0x7177a6867296406881E20d6647232314736Dd09A#writeContract
2. 连接你的钱包 (Agent owner)
3. 调用 setMetadata(114, "filecoin.pieceCID", 0x626166...)
4. 确认交易
5. 完成！

---

**文档生成时间**: 2025-11-11 15:45 UTC
**当前状态**: Agent 114 已注册，等待 metadata 更新
