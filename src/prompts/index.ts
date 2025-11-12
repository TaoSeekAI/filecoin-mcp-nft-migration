interface Prompt {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
}

/**
 * Prompt templates for guiding migration workflows
 */
export const promptTemplates = {
  getPromptList(): Prompt[] {
    return [
      {
        name: 'migration_workflow',
        description: 'NFT 迁移完整工作流程',
        arguments: [
          {
            name: 'contract_address',
            description: 'NFT 合约地址',
            required: true,
          },
        ],
      },
      {
        name: 'troubleshooting',
        description: '迁移问题排查指南',
        arguments: [
          {
            name: 'error_code',
            description: '错误代码（可选）',
            required: false,
          },
        ],
      },
      {
        name: 'setup_guide',
        description: '初始环境设置指南',
      },
      {
        name: 'quick_test',
        description: '快速测试上传功能',
      },
    ];
  },

  async getPrompt(name: string, args: any): Promise<string> {
    switch (name) {
      case 'migration_workflow':
        return this.getMigrationWorkflow(args.contract_address);
      case 'troubleshooting':
        return this.getTroubleshooting(args.error_code);
      case 'setup_guide':
        return this.getSetupGuide();
      case 'quick_test':
        return this.getQuickTest();
      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  },

  getMigrationWorkflow(contractAddress: string): string {
    return `# NFT 迁移工作流程

我将帮助你将 NFT 合约 \`${contractAddress}\` 从 IPFS 迁移到 Filecoin。

## 步骤 1: 验证环境

首先，我会检查你的环境配置是否正确：
- 私钥配置
- SDK 版本
- 钱包余额
- 授权状态

使用工具: \`verify_setup\`

## 步骤 2: 设置授权（如果需要）

如果环境检查显示授权不足，我会自动设置：
- 存入 USDFC 到 Payments 合约
- 授权 Warm Storage 服务

使用工具: \`setup_approvals\`

## 步骤 3: 扫描 NFT

扫描合约获取所有 NFT 列表：
- Token IDs
- Owners
- 当前 Token URIs

使用工具: \`nft_scan\`

## 步骤 4: 获取元数据

为每个 NFT 获取元数据（从 IPFS 或 HTTP）：
- 名称、描述
- 图片 URL
- 属性

使用工具: \`get_nft_metadata\`

## 步骤 5: 上传到 Filecoin

将每个 NFT 的元数据上传到 Filecoin：
- 创建 Storage Context
- 上传数据（最小 1 MB）
- 获取 PieceCID

使用工具: \`upload_to_filecoin\`

## 步骤 6: 更新合约

更新 NFT 合约的 tokenURI 为新的 Filecoin CID：
- 从 \`ipfs://...\` → \`ipfs://{pieceCid}\`

使用工具: \`update_contract_uri\`

## 步骤 7: ERC-8004 验证

使用 ERC-8004 验证合约验证迁移：
- 提交验证请求
- 检查验证状态

使用工具: \`erc8004_validate\`

## 步骤 8: 生成报告

生成完整的迁移报告：
- 成功迁移的 NFT 数量
- 失败的 NFT 和原因
- 交易哈希
- 验证状态

---

现在，让我开始执行这些步骤。首先检查环境配置...`;
  },

  getTroubleshooting(errorCode?: string): string {
    if (errorCode === '33') {
      return `# 错误码 33 排查指南

**错误信息**: \`exit=[33] message will not be included in a block\`

**原因**: USDFC 授权不足或未正确设置。

## 解决方案

### 1. 检查余额
使用工具: \`check_balances\`

确认：
- ✅ USDFC (钱包) > 0
- ✅ USDFC (Payments) > 35

### 2. 重新设置授权
如果余额不足，使用工具: \`setup_approvals\`

这会自动：
1. 存入 USDFC 到 Payments 合约
2. 授权 Warm Storage 服务

### 3. 验证设置
使用工具: \`verify_setup\`

确认所有检查通过。

### 4. 重新测试上传
使用工具: \`test_upload\`

---

**重要提示**:
- ⚠️ 必须使用 SDK API 获取 Payments 合约地址
- ⚠️ 不要使用硬编码的地址
- ⚠️ 确保使用 Synapse SDK v0.33.0（真实版本）`;
    }

    return `# 迁移问题排查

## 常见问题

### 1. 错误码 33 - 授权不足
**症状**: \`exit=[33]\`
**解决**: 运行 \`setup_approvals\` 工具

### 2. 上传超时
**症状**: \`Timeout waiting for piece to be parked\`
**原因**: Storage Provider 响应慢
**解决**:
- 检查网络连接
- 等待几小时后重试
- 确认文件大小 >= 1 MB

### 3. SDK 版本问题
**症状**: 上传显示 \`[MockSynapse]\` 日志
**解决**:
- 确认使用 \`@filoz/synapse-sdk@0.33.0\`
- 不要使用 v0.1.0（mock 版本）

### 4. 文件大小不足
**症状**: SP parking 失败
**解决**: 确保文件 >= 1 MB (1,048,576 bytes)

## 诊断步骤

1. **运行环境验证**
   使用工具: \`verify_setup\`

2. **检查余额**
   使用工具: \`check_balances\`

3. **测试上传**
   使用工具: \`test_upload\`

4. **查看资源状态**
   读取资源: \`nft-migration://status\`
   读取资源: \`nft-migration://balances\`

---

需要我帮助排查具体问题吗？请告诉我遇到的错误信息。`;
  },

  getSetupGuide(): string {
    return `# 环境设置指南

我将指导你完成 NFT 迁移工具的初始设置。

## 第 1 步: 验证 .env 配置

确保 \`.env\` 文件包含：

\`\`\`bash
# 私钥
PRIVATE_KEY=0x...

# 钱包地址
WALLET_ADDRESS=0x...

# RPC URLs
ETHEREUM_NETWORK_RPC_URL=https://eth-sepolia.public.blastapi.io
FILECOIN_NETWORK_RPC_URL=https://api.calibration.node.glif.io/rpc/v1
ETHEREUM_MAINNET_RPC_URL=https://eth-mainnet.public.blastapi.io
\`\`\`

## 第 2 步: 获取测试代币

需要以下代币：

1. **Sepolia ETH** (用于 ERC-8004 验证)
   - 访问: https://sepoliafaucet.com/

2. **Calibration FIL** (用于 Filecoin 交易)
   - 访问: https://faucet.calibnet.chainsafe-fil.io/

3. **USDFC** (用于存储费用)
   - 访问: https://pdp.vxb.ai/faucet

## 第 3 步: 设置授权

运行授权设置工具：

使用工具: \`setup_approvals\`

这会自动：
- 存入 35 USDFC 到 Payments 合约
- 授权 Warm Storage 服务（1 USDFC/epoch, 50 USDFC lockup, 86400 epochs）

## 第 4 步: 验证设置

使用工具: \`verify_setup\`

确认所有检查都显示 ✅。

## 第 5 步: 测试上传

使用工具: \`test_upload\`

成功后，你就可以开始迁移 NFT 了！

---

现在让我帮你检查环境配置...`;
  },

  getQuickTest(): string {
    return `# 快速测试指南

我将帮助你快速测试 Filecoin 上传功能。

## 测试步骤

### 1. 检查环境
使用工具: \`verify_setup\`

### 2. 检查余额
使用工具: \`check_balances\`

确认：
- FIL > 1 FIL
- USDFC (Payments) > 35 USDFC

### 3. 运行测试上传
使用工具: \`test_upload\` (参数: file_size_mb=1.1)

这会上传一个 1.1 MB 的测试文件到 Filecoin。

### 4. 检查结果

成功的输出应该包含：
- ✅ Selected Provider
- ✅ Data set: {dataSetId}
- ✅ Upload complete! PieceCID: {cid}

---

**注意事项**:
- 上传可能需要几分钟
- 如果超时，可能是 SP 性能问题（不是代码问题）
- 确保文件大小 >= 1 MB

现在让我开始测试...`;
  },
};
