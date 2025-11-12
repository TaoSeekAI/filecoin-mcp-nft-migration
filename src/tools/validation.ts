import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import dotenv from 'dotenv';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LIB_CORE_PATH = path.resolve(__dirname, '../../lib/core');

// Load environment variables from .env file
const envPath = path.resolve(__dirname, '../../.env');
const envConfig = dotenv.config({ path: envPath });
const env = envConfig.parsed || {};

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * ERC-8004 validation tools
 */
export const validationTools = {
  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'register_agent',
        description: '在 ERC-8004 合约上注册 AI Agent，获得 Agent ID',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Agent 名称',
            },
            description: {
              type: 'string',
              description: 'Agent 描述',
            },
            capabilities: {
              type: 'array',
              description: 'Agent 能力列表',
              items: {
                type: 'string',
              },
            },
          },
          required: ['name', 'description'],
        },
      },
      {
        name: 'get_agent_info',
        description: '查询 Agent 信息',
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: {
              type: 'string',
              description: 'Agent ID (Token ID)',
            },
          },
          required: ['agent_id'],
        },
      },
      {
        name: 'create_validation_request',
        description: '创建 ERC-8004 验证请求，记录迁移任务',
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: {
              type: 'string',
              description: 'Agent ID',
            },
            task_description: {
              type: 'string',
              description: '任务描述',
            },
            nft_contract: {
              type: 'string',
              description: 'NFT 合约地址',
            },
            token_range: {
              type: 'object',
              description: 'Token ID 范围',
              properties: {
                start: { type: 'number' },
                end: { type: 'number' },
              },
            },
            ipfs_cids: {
              type: 'array',
              description: 'IPFS CID 列表',
              items: {
                type: 'string',
              },
            },
          },
          required: ['agent_id', 'task_description', 'nft_contract'],
        },
      },
      {
        name: 'submit_validation',
        description: '提交验证结果和证明',
        inputSchema: {
          type: 'object',
          properties: {
            request_hash: {
              type: 'string',
              description: '验证请求的哈希',
            },
            is_valid: {
              type: 'boolean',
              description: '迁移是否成功',
            },
            migration_results: {
              type: 'array',
              description: '迁移结果列表',
              items: {
                type: 'object',
                properties: {
                  ipfsCid: { type: 'string' },
                  filecoinPieceCid: { type: 'string' },
                  success: { type: 'boolean' },
                },
              },
            },
          },
          required: ['request_hash', 'is_valid', 'migration_results'],
        },
      },
      {
        name: 'get_validation_status',
        description: '查询验证请求的状态',
        inputSchema: {
          type: 'object',
          properties: {
            request_hash: {
              type: 'string',
              description: '验证请求的哈希',
            },
          },
          required: ['request_hash'],
        },
      },
      {
        name: 'update_agent_metadata',
        description: '更新 ERC-8004 Agent 的 metadata，用于记录迁移后的 Filecoin URI',
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: {
              type: 'string',
              description: 'Agent ID',
            },
            metadata: {
              type: 'object',
              description: 'Metadata 键值对',
              additionalProperties: {
                type: 'string',
              },
            },
          },
          required: ['agent_id', 'metadata'],
        },
      },
    ];
  },

  hasHandler(toolName: string): boolean {
    return [
      'register_agent',
      'get_agent_info',
      'create_validation_request',
      'submit_validation',
      'get_validation_status',
      'update_agent_metadata',
    ].includes(toolName);
  },

  async handleTool(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'register_agent':
        return await this.registerAgent(args);
      case 'get_agent_info':
        return await this.getAgentInfo(args);
      case 'create_validation_request':
        return await this.createValidationRequest(args);
      case 'submit_validation':
        return await this.submitValidation(args);
      case 'get_validation_status':
        return await this.getValidationStatus(args);
      case 'update_agent_metadata':
        return await this.updateAgentMetadata(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  },

  async registerAgent(args: {
    name: string;
    description: string;
    capabilities?: string[];
  }): Promise<any> {
    try {
      // Create registration script using ERC8004Client
      const registerScript = `
import 'dotenv/config';
import { ethers } from 'ethers';
import { ERC8004Client } from './erc8004-client.js';

async function main() {
  const provider = new ethers.JsonRpcProvider(
    process.env.VALIDATION_NETWORK_RPC_URL || process.env.ETHEREUM_NETWORK_RPC_URL,
    undefined,
    { staticNetwork: true }
  );

  // Agent Owner uses PRIVATE_KEY (not VALIDATOR_PRIVATE_KEY)
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const client = new ERC8004Client(
    provider,
    signer,
    process.env.AGENT_IDENTITY_ADDRESS,
    process.env.AGENT_VALIDATION_ADDRESS
  );

  // Generate agent metadata
  const metadata = client.generateAgentMetadata(
    '${args.name}',
    '${args.description}',
    ['https://api.nft-migration.example.com'],
    ${JSON.stringify(args.capabilities || ['nft-scan', 'filecoin-upload', 'metadata-migration'])}
  );

  console.log('METADATA_START');
  console.log(JSON.stringify(metadata, null, 2));
  console.log('METADATA_END');

  // For now, use a placeholder metadata URI
  // In production, upload to IPFS first
  const metadataURI = 'ipfs://QmAgentMetadata' + Date.now();

  const result = await client.registerAgent(metadataURI);

  console.log('RESULT_START');
  console.log(JSON.stringify(result, null, 2));
  console.log('RESULT_END');
}

main().catch(console.error);
`;

      const scriptPath = path.join(LIB_CORE_PATH, 'temp-register-agent.js');
      await fs.writeFile(scriptPath, registerScript);

      // Execute registration
      const { stdout, stderr } = await execAsync('node temp-register-agent.js', {
        cwd: LIB_CORE_PATH,
        env: { ...process.env, ...env }, // Use explicitly loaded env vars
        timeout: 120000, // 2 minutes
      });

      // Clean up
      await fs.unlink(scriptPath).catch(() => {});

      // Parse result
      const output = stdout + stderr;
      let metadata, result;

      const metadataMatch = output.match(/METADATA_START\n([\s\S]*?)\nMETADATA_END/);
      if (metadataMatch) {
        metadata = JSON.parse(metadataMatch[1]);
      }

      const resultMatch = output.match(/RESULT_START\n([\s\S]*?)\nRESULT_END/);
      if (resultMatch) {
        result = JSON.parse(resultMatch[1]);
      }

      if (result && result.agentId) {
        return {
          content: [
            {
              type: 'text',
              text: `# ✅ Agent 注册成功

**Agent ID**: ${result.agentId}
**名称**: ${args.name}
**描述**: ${args.description}

## 交易信息

- **交易哈希**: \`${result.txHash}\`
- **区块号**: ${result.blockNumber}
- **Owner**: ${result.owner}

## 元数据

\`\`\`json
${JSON.stringify(metadata, null, 2)}
\`\`\`

## 链上验证

[在 Sepolia Etherscan 查看](https://sepolia.etherscan.io/tx/${result.txHash})

## 下一步

使用此 Agent ID 创建验证请求：
\`\`\`
请使用 create_validation_request 工具创建验证请求
Agent ID: ${result.agentId}
\`\`\``,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `# ⚠️ 注册结果不确定\n\n输出:\n\`\`\`\n${output}\n\`\`\``,
            },
          ],
        };
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 注册失败: ${error.message}\n\n输出:\n${error.stdout || ''}\n${error.stderr || ''}`,
          },
        ],
        isError: true,
      };
    }
  },

  async getAgentInfo(args: { agent_id: string }): Promise<any> {
    try {
      const getAgentScript = `
import 'dotenv/config';
import { ethers } from 'ethers';
import { ERC8004Client } from './erc8004-client.js';

async function main() {
  const provider = new ethers.JsonRpcProvider(
    process.env.VALIDATION_NETWORK_RPC_URL || process.env.ETHEREUM_NETWORK_RPC_URL,
    undefined,
    { staticNetwork: true }
  );

  const signer = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY || process.env.PRIVATE_KEY, provider);

  const client = new ERC8004Client(
    provider,
    signer,
    process.env.AGENT_IDENTITY_ADDRESS,
    process.env.AGENT_VALIDATION_ADDRESS
  );

  const result = await client.getAgent(${args.agent_id});

  console.log('RESULT_START');
  console.log(JSON.stringify(result, null, 2));
  console.log('RESULT_END');
}

main().catch(console.error);
`;

      const scriptPath = path.join(LIB_CORE_PATH, 'temp-get-agent.js');
      await fs.writeFile(scriptPath, getAgentScript);

      const { stdout, stderr } = await execAsync('node temp-get-agent.js', {
        cwd: LIB_CORE_PATH,
        env: { ...process.env, ...env }, // Use explicitly loaded env vars
        timeout: 60000,
      });

      await fs.unlink(scriptPath).catch(() => {});

      const output = stdout + stderr;
      let result;

      const resultMatch = output.match(/RESULT_START\n([\s\S]*?)\nRESULT_END/);
      if (resultMatch) {
        result = JSON.parse(resultMatch[1]);
      }

      if (result) {
        return {
          content: [
            {
              type: 'text',
              text: `# 📋 Agent 信息

**Agent ID**: ${result.agentId}
**Owner**: ${result.owner}
**元数据 URI**: ${result.metadataURI}
**状态**: ${result.isActive ? '✅ 活跃' : '❌ 未激活'}

## 链上查询

[在 Sepolia Etherscan 查看](https://sepolia.etherscan.io/token/${process.env.AGENT_IDENTITY_ADDRESS}?a=${result.agentId})`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `# ⚠️ 查询结果不确定\n\n输出:\n\`\`\`\n${output}\n\`\`\``,
            },
          ],
        };
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 查询失败: ${error.message}\n\n输出:\n${error.stdout || ''}\n${error.stderr || ''}`,
          },
        ],
        isError: true,
      };
    }
  },

  async createValidationRequest(args: {
    agent_id: string;
    task_description: string;
    nft_contract: string;
    token_range?: { start: number; end: number };
    ipfs_cids?: string[];
  }): Promise<any> {
    try {
      const createRequestScript = `
import 'dotenv/config';
import { ethers } from 'ethers';
import { ERC8004Client } from './erc8004-client.js';

async function main() {
  const provider = new ethers.JsonRpcProvider(
    process.env.VALIDATION_NETWORK_RPC_URL || process.env.ETHEREUM_NETWORK_RPC_URL,
    undefined,
    { staticNetwork: true }
  );

  // Agent Owner creates validation request using PRIVATE_KEY
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const signerAddress = await signer.getAddress();

  // Get validator address from VALIDATOR_PRIVATE_KEY
  const validatorWallet = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY);
  const validatorAddress = validatorWallet.address;
  console.log('Validator Address:', validatorAddress);

  const client = new ERC8004Client(
    provider,
    signer,
    process.env.AGENT_IDENTITY_ADDRESS,
    process.env.AGENT_VALIDATION_ADDRESS
  );

  // Generate task metadata
  const taskMetadata = client.generateTaskMetadata(
    '${args.task_description}',
    '${args.nft_contract}',
    ${JSON.stringify(args.token_range || { start: 0, end: 4 })},
    ${JSON.stringify(args.ipfs_cids || [])}
  );

  console.log('TASK_METADATA_START');
  console.log(JSON.stringify(taskMetadata, null, 2));
  console.log('TASK_METADATA_END');

  // For now, use a placeholder task URI
  // In production, upload to IPFS first
  const taskURI = 'ipfs://QmTaskMetadata' + Date.now();

  const result = await client.createValidationRequest(
    ${args.agent_id},
    taskURI,
    validatorAddress
  );

  console.log('RESULT_START');
  console.log(JSON.stringify(result, null, 2));
  console.log('RESULT_END');
}

main().catch(console.error);
`;

      const scriptPath = path.join(LIB_CORE_PATH, 'temp-create-request.js');
      await fs.writeFile(scriptPath, createRequestScript);

      const { stdout, stderr } = await execAsync('node temp-create-request.js', {
        cwd: LIB_CORE_PATH,
        env: { ...process.env, ...env }, // Use explicitly loaded env vars
        timeout: 120000,
      });

      await fs.unlink(scriptPath).catch(() => {});

      const output = stdout + stderr;
      let taskMetadata, result;

      const taskMatch = output.match(/TASK_METADATA_START\n([\s\S]*?)\nTASK_METADATA_END/);
      if (taskMatch) {
        taskMetadata = JSON.parse(taskMatch[1]);
      }

      const resultMatch = output.match(/RESULT_START\n([\s\S]*?)\nRESULT_END/);
      if (resultMatch) {
        result = JSON.parse(resultMatch[1]);
      }

      if (result && result.requestHash) {
        return {
          content: [
            {
              type: 'text',
              text: `# ✅ 验证请求已创建

**Request Hash**: \`${result.requestHash}\`
**Agent ID**: ${args.agent_id}

## 交易信息

- **交易哈希**: \`${result.txHash}\`
- **区块号**: ${result.blockNumber}

## 任务信息

- **描述**: ${args.task_description}
- **NFT 合约**: ${args.nft_contract}
- **Token 范围**: #${args.token_range?.start || 0} - #${args.token_range?.end || 4}

## 任务元数据

\`\`\`json
${JSON.stringify(taskMetadata, null, 2)}
\`\`\`

## 链上验证

[在 Sepolia Etherscan 查看](https://sepolia.etherscan.io/tx/${result.txHash})

## 下一步

1. 使用 MCP 工具执行 NFT 迁移
2. 收集迁移结果
3. 提交验证：

\`\`\`
请使用 submit_validation 工具提交验证结果
Request Hash: ${result.requestHash}
\`\`\``,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `# ⚠️ 创建请求结果不确定\n\n输出:\n\`\`\`\n${output}\n\`\`\``,
            },
          ],
        };
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 创建请求失败: ${error.message}\n\n输出:\n${error.stdout || ''}\n${error.stderr || ''}`,
          },
        ],
        isError: true,
      };
    }
  },

  async submitValidation(args: {
    request_hash: string;
    is_valid: boolean;
    migration_results: Array<{ ipfsCid: string; filecoinPieceCid: string; success: boolean }>;
  }): Promise<any> {
    try {
      const submitScript = `
import 'dotenv/config';
import { ethers } from 'ethers';
import { ERC8004Client } from './erc8004-client.js';

async function main() {
  const provider = new ethers.JsonRpcProvider(
    process.env.VALIDATION_NETWORK_RPC_URL || process.env.ETHEREUM_NETWORK_RPC_URL,
    undefined,
    { staticNetwork: true }
  );

  // Validator submits validation response using VALIDATOR_PRIVATE_KEY
  const signer = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY, provider);

  const client = new ERC8004Client(
    provider,
    signer,
    process.env.AGENT_IDENTITY_ADDRESS,
    process.env.AGENT_VALIDATION_ADDRESS
  );

  // Generate proof metadata
  const migrationResults = ${JSON.stringify(args.migration_results)};
  const proofMetadata = client.generateProofMetadata(
    'ipfs://QmTaskMetadata',
    migrationResults
  );

  console.log('PROOF_METADATA_START');
  console.log(JSON.stringify(proofMetadata, null, 2));
  console.log('PROOF_METADATA_END');

  // For now, use a placeholder proof URI
  // In production, upload to IPFS first
  const proofURI = 'ipfs://QmProofMetadata' + Date.now();

  const result = await client.submitValidation(
    '${args.request_hash}',
    ${args.is_valid},
    proofURI
  );

  console.log('RESULT_START');
  console.log(JSON.stringify(result, null, 2));
  console.log('RESULT_END');
}

main().catch(console.error);
`;

      const scriptPath = path.join(LIB_CORE_PATH, 'temp-submit-validation.js');
      await fs.writeFile(scriptPath, submitScript);

      const { stdout, stderr } = await execAsync('node temp-submit-validation.js', {
        cwd: LIB_CORE_PATH,
        env: { ...process.env, ...env }, // Use explicitly loaded env vars
        timeout: 120000,
      });

      await fs.unlink(scriptPath).catch(() => {});

      const output = stdout + stderr;
      let proofMetadata, result;

      const proofMatch = output.match(/PROOF_METADATA_START\n([\s\S]*?)\nPROOF_METADATA_END/);
      if (proofMatch) {
        proofMetadata = JSON.parse(proofMatch[1]);
      }

      const resultMatch = output.match(/RESULT_START\n([\s\S]*?)\nRESULT_END/);
      if (resultMatch) {
        result = JSON.parse(resultMatch[1]);
      }

      if (result && result.txHash) {
        const summary = proofMetadata?.proof?.summary || {};
        return {
          content: [
            {
              type: 'text',
              text: `# ✅ 验证结果已提交

**Request Hash**: \`${args.request_hash}\`
**验证状态**: ${args.is_valid ? '✅ 通过' : '❌ 失败'}

## 交易信息

- **交易哈希**: \`${result.txHash}\`
- **区块号**: ${result.blockNumber}

## 迁移统计

- **总计**: ${summary.total || args.migration_results.length} 个 NFT
- **成功**: ${summary.successful || args.migration_results.filter((r: any) => r.success).length}
- **失败**: ${summary.failed || 0}
- **成功率**: ${summary.successRate || 100}%

## 证明元数据

\`\`\`json
${JSON.stringify(proofMetadata, null, 2)}
\`\`\`

## 链上验证

[在 Sepolia Etherscan 查看](https://sepolia.etherscan.io/tx/${result.txHash})

## 下一步

查询验证状态：

\`\`\`
请使用 get_validation_status 工具查询验证状态
Request Hash: ${args.request_hash}
\`\`\``,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `# ⚠️ 提交结果不确定\n\n输出:\n\`\`\`\n${output}\n\`\`\``,
            },
          ],
        };
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 提交验证失败: ${error.message}\n\n输出:\n${error.stdout || ''}\n${error.stderr || ''}`,
          },
        ],
        isError: true,
      };
    }
  },

  async getValidationStatus(args: { request_hash: string }): Promise<any> {
    try {
      const getStatusScript = `
import 'dotenv/config';
import { ethers } from 'ethers';
import { ERC8004Client } from './erc8004-client.js';

async function main() {
  const provider = new ethers.JsonRpcProvider(
    process.env.VALIDATION_NETWORK_RPC_URL || process.env.ETHEREUM_NETWORK_RPC_URL,
    undefined,
    { staticNetwork: true }
  );

  const signer = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY || process.env.PRIVATE_KEY, provider);

  const client = new ERC8004Client(
    provider,
    signer,
    process.env.AGENT_IDENTITY_ADDRESS,
    process.env.AGENT_VALIDATION_ADDRESS
  );

  const result = await client.getValidationRequest('${args.request_hash}');

  console.log('RESULT_START');
  console.log(JSON.stringify(result, null, 2));
  console.log('RESULT_END');
}

main().catch(console.error);
`;

      const scriptPath = path.join(LIB_CORE_PATH, 'temp-get-status.js');
      await fs.writeFile(scriptPath, getStatusScript);

      const { stdout, stderr } = await execAsync('node temp-get-status.js', {
        cwd: LIB_CORE_PATH,
        env: { ...process.env, ...env }, // Use explicitly loaded env vars
        timeout: 60000,
      });

      await fs.unlink(scriptPath).catch(() => {});

      const output = stdout + stderr;
      let result;

      const resultMatch = output.match(/RESULT_START\n([\s\S]*?)\nRESULT_END/);
      if (resultMatch) {
        result = JSON.parse(resultMatch[1]);
      }

      if (result) {
        const statusEmoji = result.status === 'Completed' ? '✅' : result.status === 'Pending' ? '⏳' : '❌';
        return {
          content: [
            {
              type: 'text',
              text: `# ${statusEmoji} 验证请求状态

**Request Hash**: \`${result.requestHash}\`
**状态**: ${result.status}
**验证通过**: ${result.isValid ? '✅ 是' : result.status === 'Pending' ? '⏳ 待验证' : '❌ 否'}

## 详细信息

- **Agent ID**: ${result.agentId}
- **请求者**: ${result.requester}
- **验证者**: ${result.validator}
- **任务 URI**: ${result.workURI}
- **证明 URI**: ${result.proofURI || '尚未提交'}
- **请求时间**: ${result.requestedAt ? new Date(Number(result.requestedAt) * 1000).toLocaleString() : 'N/A'}
- **提交时间**: ${result.submittedAt ? new Date(Number(result.submittedAt) * 1000).toLocaleString() : '尚未提交'}

## 链上查询

[在 Sepolia Etherscan 查看合约](https://sepolia.etherscan.io/address/${process.env.AGENT_VALIDATION_ADDRESS})

${result.status === 'Completed' && result.isValid ? '## 🎉 验证完成\n\nNFT 迁移已通过 ERC-8004 验证，所有数据已记录在区块链上！' : ''}`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `# ⚠️ 查询结果不确定\n\n输出:\n\`\`\`\n${output}\n\`\`\``,
            },
          ],
        };
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 查询状态失败: ${error.message}\n\n输出:\n${error.stdout || ''}\n${error.stderr || ''}`,
          },
        ],
        isError: true,
      };
    }
  },

  async updateAgentMetadata(args: {
    agent_id: string;
    metadata: Record<string, string>;
  }): Promise<any> {
    try {
      const metadataEntries = Object.entries(args.metadata);

      if (metadataEntries.length === 0) {
        return {
          content: [{ type: 'text', text: '❌ Metadata 不能为空' }],
          isError: true,
        };
      }

      // Build metadata updates for the script
      const metadataUpdatesCode = metadataEntries
        .map(
          ([key, value]) =>
            `{ key: '${key.replace(/'/g, "\\'")}', value: '${value.replace(/'/g, "\\'")}' }`
        )
        .join(',\n    ');

      // Build script without nested template literals to avoid parsing issues
      const updateScript =
        "import 'dotenv/config';\n" +
        "import { ethers } from 'ethers';\n" +
        "\n" +
        "async function main() {\n" +
        "  const provider = new ethers.JsonRpcProvider(\n" +
        "    process.env.VALIDATION_NETWORK_RPC_URL || process.env.ETHEREUM_NETWORK_RPC_URL,\n" +
        "    undefined,\n" +
        "    { staticNetwork: true }\n" +
        "  );\n" +
        "\n" +
        "  // Agent Owner updates metadata using PRIVATE_KEY\n" +
        "  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);\n" +
        "  const signerAddress = await signer.getAddress();\n" +
        "\n" +
        "  const identityAddress = process.env.AGENT_IDENTITY_ADDRESS;\n" +
        `  const agentId = ${args.agent_id};\n` +
        "\n" +
        "  // Identity 合约 ABI\n" +
        "  const identityAbi = [\n" +
        "    'function ownerOf(uint256 tokenId) external view returns (address)',\n" +
        "    'function setMetadata(uint256 agentId, string key, bytes value) external',\n" +
        "    'function getMetadata(uint256 agentId, string key) external view returns (bytes)',\n" +
        "    'event MetadataSet(uint256 indexed agentId, string indexed indexedKey, string key, bytes value)'\n" +
        "  ];\n" +
        "\n" +
        "  const identityContract = new ethers.Contract(identityAddress, identityAbi, signer);\n" +
        "\n" +
        "  // 验证所有权\n" +
        "  console.log('\\\\n👤 验证 Agent 所有权...');\n" +
        "  const owner = await identityContract.ownerOf(agentId);\n" +
        "  console.log('   Agent Owner: ' + owner);\n" +
        "  console.log('   Current Signer: ' + signerAddress);\n" +
        "\n" +
        "  if (owner.toLowerCase() !== signerAddress.toLowerCase()) {\n" +
        "    throw new Error('❌ 你不是这个 Agent 的 owner，无法更新 metadata');\n" +
        "  }\n" +
        "\n" +
        "  // 准备 metadata 更新\n" +
        "  const metadataUpdates = [\n" +
        `    ${metadataUpdatesCode}\n` +
        "  ];\n" +
        "\n" +
        "  console.log('\\\\n📤 更新 ' + metadataUpdates.length + ' 个 Metadata 字段...\\\\n');\n" +
        "\n" +
        "  const results = [];\n" +
        "  for (const update of metadataUpdates) {\n" +
        "    console.log('   更新 \"' + update.key + '\"...');\n" +
        "\n" +
        "    try {\n" +
        "      const valueBytes = ethers.toUtf8Bytes(update.value);\n" +
        "\n" +
        "      const gasEstimate = await identityContract.setMetadata.estimateGas(\n" +
        "        agentId,\n" +
        "        update.key,\n" +
        "        valueBytes\n" +
        "      );\n" +
        "      console.log('   ✅ Gas Estimate: ' + gasEstimate.toString());\n" +
        "\n" +
        "      const tx = await identityContract.setMetadata(\n" +
        "        agentId,\n" +
        "        update.key,\n" +
        "        valueBytes\n" +
        "      );\n" +
        "\n" +
        "      console.log('   Transaction: ' + tx.hash);\n" +
        "      const receipt = await tx.wait();\n" +
        "      console.log('   ✅ Confirmed in block ' + receipt.blockNumber);\n" +
        "\n" +
        "      results.push({\n" +
        "        key: update.key,\n" +
        "        value: update.value,\n" +
        "        txHash: tx.hash,\n" +
        "        blockNumber: receipt.blockNumber,\n" +
        "        gasUsed: receipt.gasUsed.toString(),\n" +
        "        success: true\n" +
        "      });\n" +
        "\n" +
        "    } catch (error) {\n" +
        "      console.error('   ❌ 更新失败: ' + error.message);\n" +
        "      results.push({\n" +
        "        key: update.key,\n" +
        "        value: update.value,\n" +
        "        error: error.message,\n" +
        "        success: false\n" +
        "      });\n" +
        "    }\n" +
        "  }\n" +
        "\n" +
        "  // 验证更新\n" +
        "  console.log('\\\\n🔍 验证 Metadata 更新...\\\\n');\n" +
        "  for (const update of metadataUpdates) {\n" +
        "    try {\n" +
        "      const storedValue = await identityContract.getMetadata(agentId, update.key);\n" +
        "      const decodedValue = ethers.toUtf8String(storedValue);\n" +
        "      const verified = decodedValue === update.value;\n" +
        "      console.log('   ' + (verified ? '✅' : '❌') + ' ' + update.key + ': ' + (verified ? 'verified' : 'mismatch'));\n" +
        "    } catch (error) {\n" +
        "      console.log('   ⚠️  ' + update.key + ': 无法读取');\n" +
        "    }\n" +
        "  }\n" +
        "\n" +
        "  console.log('RESULT_START');\n" +
        "  console.log(JSON.stringify({\n" +
        "    agentId,\n" +
        "    owner: signerAddress,\n" +
        "    updatesCount: metadataUpdates.length,\n" +
        "    successful: results.filter(r => r.success).length,\n" +
        "    failed: results.filter(r => !r.success).length,\n" +
        "    results\n" +
        "  }, null, 2));\n" +
        "  console.log('RESULT_END');\n" +
        "}\n" +
        "\n" +
        "main().catch(console.error);\n";

      const scriptPath = path.join(LIB_CORE_PATH, 'temp-update-metadata.js');
      await fs.writeFile(scriptPath, updateScript);

      // Execute update
      const { stdout, stderr } = await execAsync('node temp-update-metadata.js', {
        cwd: LIB_CORE_PATH,
        env: { ...process.env, ...env }, // Use explicitly loaded env vars
        timeout: 180000, // 3 minutes
      });

      // Clean up
      await fs.unlink(scriptPath).catch(() => {});

      const output = stdout + stderr;
      let result;

      const resultMatch = output.match(/RESULT_START\n([\s\S]*?)\nRESULT_END/);
      if (resultMatch) {
        result = JSON.parse(resultMatch[1]);
      }

      if (result) {
        const successRate = Math.round((result.successful / result.updatesCount) * 100);

        let responseText = `# ✅ Agent Metadata 已更新\n\n`;
        responseText += `**Agent ID**: ${result.agentId}\n`;
        responseText += `**Owner**: ${result.owner}\n`;
        responseText += `**更新总数**: ${result.updatesCount}\n`;
        responseText += `**成功**: ${result.successful} (${successRate}%)\n`;
        responseText += `**失败**: ${result.failed}\n\n`;
        responseText += `## 更新详情\n\n`;

        for (const item of result.results) {
          if (item.success) {
            const valueDisplay = item.value.length > 80 ? item.value.substring(0, 80) + '...' : item.value;
            responseText += `### ✅ ${item.key}\n\n`;
            responseText += `- **Value**: \`${valueDisplay}\`\n`;
            responseText += `- **Transaction**: [${item.txHash.substring(0, 10)}...](https://sepolia.etherscan.io/tx/${item.txHash})\n`;
            responseText += `- **Block**: ${item.blockNumber}\n`;
            responseText += `- **Gas Used**: ${item.gasUsed}\n\n`;
          } else {
            responseText += `### ❌ ${item.key}\n\n`;
            responseText += `- **Error**: ${item.error}\n\n`;
          }
        }

        responseText += `## 🔗 查看 Agent\n\n`;
        responseText += `- [Etherscan Token](https://sepolia.etherscan.io/token/${process.env.AGENT_IDENTITY_ADDRESS}?a=${result.agentId})\n`;
        responseText += `- [Etherscan NFT](https://sepolia.etherscan.io/nft/${process.env.AGENT_IDENTITY_ADDRESS}/${result.agentId})\n\n`;

        if (result.successful > 0) {
          responseText += `## 🎉 完成！\n\n`;
          responseText += `你的 Agent metadata 已成功更新并记录在 Sepolia 区块链上！`;
        }

        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `# ⚠️ 更新结果不确定\n\n输出:\n\`\`\`\n${output}\n\`\`\``,
            },
          ],
        };
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 更新 Agent metadata 失败: ${error.message}\n\n输出:\n${error.stdout || ''}\n${error.stderr || ''}`,
          },
        ],
        isError: true,
      };
    }
  },
};
