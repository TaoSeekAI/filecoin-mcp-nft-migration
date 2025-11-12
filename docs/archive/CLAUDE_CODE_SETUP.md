# Claude Code + MCP Server 配置指南

本指南将帮助你配置 Claude Code Desktop 使用 NFT Migration MCP Server。

## 前提条件

1. ✅ 已安装 Claude Code Desktop
2. ✅ 已完成 mvp-demo 环境设置（.env 配置、测试代币）
3. ✅ Node.js >= 20.10.0

## 第 1 步: 构建 MCP Server

```bash
cd mcp-nft-migration
npm install
npm run build
```

验证构建成功：
```bash
ls build/index.js
# 应该存在且有执行权限
```

## 第 2 步: 配置 Claude Code Desktop

找到 Claude Code 配置文件：

**macOS/Linux**:
```
~/.config/Claude/claude_desktop_config.json
```

**Windows**:
```
%APPDATA%\Claude\claude_desktop_config.json
```

## 第 3 步: 添加 MCP Server 配置

编辑 `claude_desktop_config.json`，添加以下内容：

```json
{
  "mcpServers": {
    "nft-migration": {
      "command": "node",
      "args": [
        "/var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration/build/index.js"
      ],
      "env": {
        "PRIVATE_KEY": "0xe4db9f0c28faad37e59e900592a45d2556e3d76137f7a45f83e5740ab35b7e9f",
        "WALLET_ADDRESS": "0xB34d4c8E3AcCB5FA62455228281649Be525D4e59",
        "ETHEREUM_NETWORK_RPC_URL": "https://eth-sepolia.public.blastapi.io",
        "FILECOIN_NETWORK_RPC_URL": "https://api.calibration.node.glif.io/rpc/v1",
        "ETHEREUM_MAINNET_RPC_URL": "https://eth-mainnet.public.blastapi.io"
      }
    }
  }
}
```

⚠️ **重要**: 请将路径 `/var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration/build/index.js` 替换为你的实际路径。

## 第 4 步: 重启 Claude Code Desktop

完全退出 Claude Code Desktop 并重新启动，以加载新的 MCP 配置。

## 第 5 步: 验证连接

在 Claude Code 中，你应该能看到 NFT Migration MCP Server 已连接。

测试连接：

```
你好，请列出可用的 MCP 工具。
```

Claude 应该能看到以下工具：
- `verify_setup` - 验证环境配置
- `setup_approvals` - 设置授权
- `check_balances` - 检查余额
- `upload_to_filecoin` - 上传到 Filecoin
- `test_upload` - 测试上传
- `nft_scan` - 扫描 NFT
- `get_nft_metadata` - 获取元数据
- `erc8004_validate` - ERC-8004 验证
- `update_contract_uri` - 更新合约 URI

---

## 使用示例

### 示例 1: 快速测试

```
请帮我测试 Filecoin 上传功能是否正常。
```

Claude 会自动：
1. 检查环境配置 (`verify_setup`)
2. 检查余额 (`check_balances`)
3. 运行测试上传 (`test_upload`)
4. 报告结果

### 示例 2: 迁移单个 NFT

```
请将合约 0x1234...5678 的 Token ID #1 迁移到 Filecoin。
```

Claude 会自动：
1. 验证环境
2. 获取 NFT 元数据 (`get_nft_metadata`)
3. 上传到 Filecoin (`upload_to_filecoin`)
4. 更新合约 URI (`update_contract_uri`)
5. ERC-8004 验证 (`erc8004_validate`)

### 示例 3: 批量迁移

```
帮我迁移合约 0x1234...5678 的所有 NFT 到 Filecoin。
```

Claude 会自动：
1. 扫描所有 NFT (`nft_scan`)
2. 对每个 NFT 执行完整迁移流程
3. 生成迁移报告

### 示例 4: 使用 Prompt 模板

```
/prompt migration_workflow contract_address=0x1234...5678
```

或者：

```
请使用 migration_workflow 提示模板，合约地址是 0x1234...5678
```

### 示例 5: 排查问题

```
我遇到了错误码 33，怎么解决？
```

或者：

```
/prompt troubleshooting error_code=33
```

---

## 可用资源

你可以要求 Claude 读取以下资源：

1. **迁移状态**
   ```
   请查看当前的迁移状态。
   ```
   资源: `nft-migration://status`

2. **钱包余额**
   ```
   请查看我的钱包余额。
   ```
   资源: `nft-migration://balances`

3. **合约地址**
   ```
   请显示 Filecoin 合约地址。
   ```
   资源: `nft-migration://contracts`

4. **环境配置**
   ```
   请查看环境配置信息。
   ```
   资源: `nft-migration://environment`

---

## 可用提示模板

1. **migration_workflow** - 完整迁移工作流程
   ```
   /prompt migration_workflow contract_address=0x...
   ```

2. **troubleshooting** - 问题排查指南
   ```
   /prompt troubleshooting error_code=33
   ```

3. **setup_guide** - 初始设置指南
   ```
   /prompt setup_guide
   ```

4. **quick_test** - 快速测试
   ```
   /prompt quick_test
   ```

---

## 故障排除

### MCP Server 无法启动

1. 检查 Node.js 版本：
   ```bash
   node --version  # 应该 >= 20.10.0
   ```

2. 检查构建是否成功：
   ```bash
   ls -l mcp-nft-migration/build/index.js
   ```

3. 手动测试 MCP Server：
   ```bash
   node mcp-nft-migration/build/index.js
   # 应该输出: NFT Migration MCP Server running on stdio
   ```

### 工具执行失败

1. 检查 .env 配置是否正确
2. 检查私钥和钱包地址
3. 检查 RPC URLs 是否可访问
4. 运行 `verify_setup` 工具检查环境

### 上传超时

这通常不是 MCP Server 的问题，而是 Filecoin Storage Provider 性能问题。参考 CURRENT_STATUS.md 中的说明。

---

## 高级配置

### 自定义存款金额

在使用 `setup_approvals` 时指定：

```
请设置授权，存入 50 USDFC。
```

### 自定义测试文件大小

```
请测试上传，使用 2 MB 的文件。
```

---

## 安全提示

⚠️ **私钥安全**:
- 配置文件中的私钥是明文存储
- 确保配置文件权限设置正确（仅当前用户可读）
- 不要将配置文件提交到 Git
- 仅在测试网使用

建议权限设置：
```bash
chmod 600 ~/.config/Claude/claude_desktop_config.json
```

---

## 下一步

1. ✅ 完成配置并重启 Claude Code
2. ✅ 运行 `/prompt quick_test` 测试基本功能
3. ✅ 尝试迁移一个测试 NFT
4. ✅ 查看完整的 LLM_MCP_INTEGRATION.md 了解架构细节

---

## 反馈和支持

如果遇到问题：
1. 查看 TROUBLESHOOTING.md
2. 运行 `verify_setup` 工具
3. 检查 Claude Code 的日志输出
4. 查看 MCP Server 输出（stderr）

祝使用愉快！🚀
