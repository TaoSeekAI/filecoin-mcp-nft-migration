# 🚀 NFT IPFS to Filecoin Migration MCP Server

**一句话说明**: 通过 Claude Desktop 对话完成 NFT 元数据从 IPFS 到 Filecoin 的迁移，并在 ERC-8004 链上记录验证。

> **最新测试**: ✅ 2025-11-12 完整流程验证通过 (Agent ID: 145, Response: 100)

---

## 📋 项目概述

这是一个 Model Context Protocol (MCP) 服务器，允许你通过自然语言对话完成 NFT 元数据迁移：

```
NFT (以太坊主网) → IPFS 元数据 → Filecoin 永久存储 → Sepolia 链上验证
```

### 核心功能

- ✅ **NFT 扫描**: 获取以太坊主网 NFT 元数据
- ✅ **Filecoin 上传**: 将元数据上传到 Filecoin 网络
- ✅ **ERC-8004 验证**: AI Agent 注册和链上验证
- ✅ **对话式操作**: 通过 Claude Desktop 简单对话完成所有步骤

---

## 🎯 快速开始（5 分钟）

### 1. 安装依赖

```bash
npm install
npm run build
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入你的私钥和 RPC URL
```

**重要**: 需要两个不同的钱包地址：
- `PRIVATE_KEY`: Agent 拥有者钱包
- `VALIDATOR_PRIVATE_KEY`: 验证者钱包（必须不同）

### 3. 配置 Claude Desktop

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "nft-migration": {
      "command": "node",
      "args": ["/绝对路径/mcp-nft-migration/build/index.js"]
    }
  }
}
```

### 4. 重启 Claude Desktop

重启后看到 🔨 图标即表示 MCP 服务器已加载。

---

## 💬 使用方式

**详细对话步骤请查看 → [CHAT_GUIDE.md](./CHAT_GUIDE.md)**

### 简单示例

```
你: 验证环境配置
Claude: ✅ 环境就绪，FIL 余额 104.99

你: 注册一个 NFT Migration Agent
Claude: ✅ Agent ID: 145

你: 上传 Azuki #1 到 Filecoin
Claude: ✅ PieceCID: bafkz...

你: 创建验证请求并提交
Claude: ✅ 验证通过！Response: 100
```

---

## 🛠️ MCP 工具列表

| 工具 | 功能 |
|-----|------|
| `verify_setup` | 验证环境配置 |
| `nft_scan` | 扫描 NFT 合约 |
| `get_nft_metadata` | 获取 NFT 元数据 |
| `upload_to_filecoin` | 上传到 Filecoin |
| `register_agent` | 注册 AI Agent |
| `create_validation_request` | 创建验证请求 |
| `submit_validation` | 提交验证结果 |
| `get_validation_status` | 查询验证状态 |

---

## 📁 项目结构

```
mcp-nft-migration/
├── src/                    # TypeScript MCP 服务器源码
│   ├── index.ts           # MCP 服务器入口
│   ├── index-daemon.ts    # 守护进程模式
│   ├── tools/             # MCP 工具实现
│   │   ├── setup.ts       # 环境验证和授权设置
│   │   ├── upload.ts      # Filecoin 上传
│   │   ├── nft.ts         # NFT 扫描和元数据获取
│   │   └── validation.ts  # ERC-8004 验证
│   ├── resources/         # MCP 资源
│   └── prompts/           # MCP 提示模板
│
├── lib/                   # 核心业务逻辑（JavaScript）
│   ├── core/              # 核心模块
│   │   ├── filecoin-uploader.js   # Filecoin 上传器
│   │   ├── nft-scanner.js         # NFT 扫描器
│   │   └── erc8004-client.js      # ERC-8004 客户端
│   ├── scripts/           # 辅助脚本
│   │   ├── setup-via-sdk.js       # 授权设置
│   │   ├── pre-upload-check.js    # 上传前检查
│   │   └── check-balances.js      # 余额检查
│   └── utils/             # 工具函数
│
├── examples/              # 示例代码
│   ├── demo.js           # 完整演示
│   └── scan-azuki.js     # Azuki 扫描示例
│
├── build/                # 编译输出
├── temp/                 # 临时文件
├── .env.example          # 环境变量模板
├── package.json          # 依赖配置
└── README.md             # 本文档
```

---

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd mcp-nft-migration
```

### 2. 安装依赖

```bash
npm install
```

这将自动安装所有依赖，包括：
- MCP SDK
- Synapse SDK (v0.35.3)
- Ethers.js
- 其他工具库

### 3. 配置环境

复制环境变量模板并填写：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 钱包私钥（测试网）
PRIVATE_KEY=0x...

# 钱包地址
WALLET_ADDRESS=0x...

# 以太坊 RPC（读取 NFT）
ETHEREUM_MAINNET_RPC_URL=https://eth-mainnet.public.blastapi.io
ETHEREUM_NETWORK_RPC_URL=https://eth-sepolia.public.blastapi.io

# Filecoin RPC（存储）
FILECOIN_NETWORK_RPC_URL=https://api.calibration.node.glif.io/rpc/v1

# ERC-8004 合约（可选）
ERC8004_CONTRACT_ADDRESS=0x...
```

### 4. 构建项目

```bash
npm run build
```

### 5. 配置 Claude Code Desktop

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
        "ETHEREUM_NETWORK_RPC_URL": "https://eth-sepolia.public.blastapi.io",
        "FILECOIN_NETWORK_RPC_URL": "https://api.calibration.node.glif.io/rpc/v1",
        "ETHEREUM_MAINNET_RPC_URL": "https://eth-mainnet.public.blastapi.io"
      }
    }
  }
}
```

**重要提示：**
- 使用绝对路径
- 环境变量可以在这里直接配置（会覆盖 .env 文件）
- 设置文件权限：`chmod 600 ~/.config/Claude/claude_desktop_config.json`

### 6. 重启 Claude Code Desktop

完全退出并重新启动 Claude Code。

### 7. 验证安装

在 Claude Code 中输入：

```
请检查我的 Filecoin 环境配置。
```

Claude 将调用 `verify_setup` 工具，检查所有配置。

---

## 📖 使用示例

### 示例 1: 首次设置

```
我是第一次使用，请帮我设置 Filecoin 环境。
```

Claude 会：
1. 验证环境配置
2. 检查余额
3. 设置授权（存入 USDFC 并授权 Warm Storage）
4. 确认设置成功

### 示例 2: 扫描 NFT 合约

```
请扫描 Azuki 合约 0xed5af388653567af2f388e6224dc7c4b3241c544 的前 5 个 NFT。
```

Claude 会：
1. 调用 `nft_scan` 工具
2. 返回 NFT 列表
3. 显示 Token IDs、Owners、元数据
4. 列出发现的 IPFS CIDs

### 示例 3: 上传单个 NFT 到 Filecoin

```
请将 Azuki #0 上传到 Filecoin，合约地址是 0xed5af388653567af2f388e6224dc7c4b3241c544。
```

Claude 会：
1. 获取 NFT 元数据
2. 验证环境配置
3. 上传到 Filecoin
4. 返回 PieceCID 和验证链接

### 示例 4: 批量迁移

```
请批量上传 Azuki 合约的所有 NFT。
```

Claude 会：
1. 扫描所有 NFT
2. 逐个上传到 Filecoin
3. 统计成功/失败数量
4. 生成详细报告

### 示例 5: 故障排查

```
我遇到了 "Insufficient USDFC" 错误，怎么办？
```

Claude 会：
1. 检查余额
2. 建议从水龙头获取 USDFC
3. 指导设置授权
4. 提供详细解决方案

---

## 🛠️ 可用命令

### 开发命令

```bash
# 构建项目
npm run build

# 监听文件变化（开发模式）
npm run watch

# 运行 stdio 模式（手动测试）
npm run dev

# 运行守护进程模式
npm run daemon
```

### 实用脚本

```bash
# 运行完整演示
npm run demo

# 环境设置（存入 USDFC 并授权）
npm run setup

# 检查环境配置
npm run check
```

### 手动测试

```bash
# 验证环境
node lib/scripts/pre-upload-check.js

# 设置授权
node lib/scripts/setup-via-sdk.js

# 检查余额
node lib/scripts/check-balances.js

# 扫描 Azuki NFT
node examples/scan-azuki.js
```

---

## 🏗️ 技术架构

```
用户（自然语言）
    ↓
Claude Code Desktop
    ↓ MCP Protocol
MCP Server（TypeScript）
    ├── src/tools/         # 工具层（调用 lib/）
    ├── src/resources/     # 资源层
    └── src/prompts/       # 提示层
    ↓
Core Library（JavaScript）
    ├── lib/core/          # 核心业务逻辑
    │   ├── filecoin-uploader.js
    │   ├── nft-scanner.js
    │   └── erc8004-client.js
    └── lib/scripts/       # 辅助脚本
        ├── setup-via-sdk.js
        ├── pre-upload-check.js
        └── check-balances.js
    ↓
External Services
    ├── Filecoin Calibration (Synapse SDK)
    ├── Ethereum Sepolia (ERC-8004)
    └── Ethereum Mainnet (NFT 读取)
```

---

## 🔧 技术栈

### 核心依赖

- **MCP SDK**: `@modelcontextprotocol/sdk` ^1.20.1
- **Synapse SDK**: `@filoz/synapse-sdk` ^0.35.3
- **Ethers.js**: `ethers` ^6.9.0
- **Axios**: `axios` ^1.6.2
- **Zod**: `zod` ^3.22.4
- **Express**: `express` ^4.18.2

### 开发依赖

- **TypeScript**: `typescript` ^5.3.0
- **Node Types**: `@types/node` ^20.10.0
- **Express Types**: `@types/express` ^4.17.21
- **Prettier**: `prettier` ^3.1.0

### 运行环境

- **Node.js**: >= 18.0.0
- **操作系统**: macOS, Linux, Windows

---

## 🌐 网络配置

### Ethereum Sepolia（ERC-8004 验证）
- **RPC**: https://eth-sepolia.public.blastapi.io
- **用途**: 部署和调用 ERC-8004 验证合约
- **Chain ID**: 11155111

### Filecoin Calibration（存储）
- **RPC**: https://api.calibration.node.glif.io/rpc/v1
- **用途**: 上传 NFT 元数据到 Filecoin
- **SDK**: Synapse SDK v0.35.3
- **Chain ID**: 314159

### Ethereum Mainnet（只读）
- **RPC**: https://eth-mainnet.public.blastapi.io
- **用途**: 读取 NFT 合约（只读，不发送交易）
- **Chain ID**: 1

---

## 💰 所需代币

### 1. Sepolia ETH
- **用途**: ERC-8004 验证交易 gas
- **获取**: https://sepoliafaucet.com/
- **所需数量**: ~0.01 ETH

### 2. Calibration FIL
- **用途**: Filecoin 交易 gas
- **获取**: https://faucet.calibnet.chainsafe-fil.io/
- **所需数量**: ~100 FIL（测试网）

### 3. USDFC
- **用途**: Filecoin 存储费用
- **获取**: https://pdp.vxb.ai/faucet
- **所需数量**: ~35 USDFC（可设置）

---

## ⚠️ 注意事项

### 1. 私钥安全
- 配置文件中的私钥是明文存储
- **仅用于测试网**
- 设置正确的文件权限：`chmod 600 ~/.config/Claude/claude_desktop_config.json`
- **永远不要在主网使用这些配置**

### 2. Storage Provider 性能
- Calibration 测试网的 SP 可能响应较慢
- 上传超时不一定是代码问题
- 建议在网络良好时测试
- 可能需要等待几分钟才能完成上传

### 3. 文件大小要求
- Storage Provider 要求最小文件大小 1 MB
- 小于 1 MB 的元数据会自动填充
- 填充数据不影响原始元数据

### 4. 授权设置
- 必须先运行 `setup_approvals` 设置授权
- 否则会遇到错误码 33（Insufficient allowance）
- 授权会定期过期，需要重新设置

### 5. 余额要求
- FIL 余额需充足（建议 > 100 FIL）
- USDFC 钱包余额需 >= 存款金额
- Payments 合约余额需 > 0

---

## 🐛 故障排查

### 错误码 33
**症状**: `PaymentsService error: code 33`

**原因**: Payments 合约余额不足或服务授权未设置

**解决方案**:
```bash
# 1. 检查余额
npm run check

# 2. 设置授权
npm run setup
```

### SDK 初始化失败
**症状**: `Failed to initialize Synapse SDK`

**原因**: 私钥或 RPC URL 配置错误

**解决方案**:
1. 检查 `.env` 文件配置
2. 验证私钥格式（必须以 0x 开头）
3. 测试 RPC URL 连通性

### 上传超时
**症状**: 上传过程卡住或超时

**原因**: Storage Provider 响应慢或网络问题

**解决方案**:
1. 检查网络连接
2. 稍后重试
3. 使用较小的测试文件

### NFT 扫描失败
**症状**: `Failed to scan NFT contract`

**原因**: RPC 限流或合约地址错误

**解决方案**:
1. 验证合约地址格式
2. 检查 RPC URL 配置
3. 稍后重试

---

## 📚 相关文档

- **ERC8004_INTEGRATION.md** - ERC-8004 集成指南
- **CLAUDE_CODE_SETUP.md** - Claude Code 详细配置
- **.env.example** - 环境变量配置模板
- **examples/** - 示例代码和用法

---

## 🧪 测试

### 单元测试

```bash
# 测试环境配置
node lib/scripts/pre-upload-check.js

# 测试小文件上传
# （在 Claude Code 中）
请测试 1.1 MB 的文件上传。
```

### 集成测试

```bash
# 运行完整演示
npm run demo
```

### MCP 服务器测试

```bash
# 直接运行（stdio 模式）
node build/index.js

# 应该输出:
# NFT Migration MCP Server running on stdio
```

---

## 🤝 贡献

欢迎贡献代码、报告问题或提出建议！

### 开发流程

1. Fork 项目
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

### 代码规范

- TypeScript 代码使用 ESLint
- JavaScript 代码使用 Prettier
- 提交信息遵循 Conventional Commits

---

## 📄 许可证

MIT License

---

## 🎉 致谢

- [Filecoin Synapse SDK](https://docs.synapse.filoz.io/)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [Claude Code Desktop](https://claude.ai/download)
- [Anthropic](https://www.anthropic.com/)
- [Ethers.js](https://ethers.org/)
- [ERC-8004 Standard](https://eips.ethereum.org/EIPS/eip-8004)

---

## 📞 支持

如有问题或需要帮助，请：
1. 查看本 README 的故障排查部分
2. 查看相关文档
3. 提交 GitHub Issue

---

**Happy Migrating! 🚀**
