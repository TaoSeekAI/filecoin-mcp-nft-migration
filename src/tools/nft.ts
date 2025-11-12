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
 * NFT scanning and discovery tools
 */
export const nftTools = {
  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'nft_scan',
        description: '扫描以太坊 NFT 合约，获取 NFT 列表和元数据',
        inputSchema: {
          type: 'object',
          properties: {
            contract_address: {
              type: 'string',
              description: 'NFT 合约地址',
            },
            token_ids: {
              type: 'array',
              description: 'Token ID 列表（可选，不提供则扫描所有）',
              items: {
                type: 'string',
              },
            },
          },
          required: ['contract_address'],
        },
      },
      {
        name: 'get_nft_metadata',
        description: '获取单个 NFT 的元数据（从 IPFS 或 HTTP）',
        inputSchema: {
          type: 'object',
          properties: {
            contract_address: {
              type: 'string',
              description: 'NFT 合约地址',
            },
            token_id: {
              type: 'string',
              description: 'Token ID',
            },
          },
          required: ['contract_address', 'token_id'],
        },
      },
    ];
  },

  hasHandler(toolName: string): boolean {
    return ['nft_scan', 'get_nft_metadata'].includes(toolName);
  },

  async handleTool(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'nft_scan':
        return await this.nftScan(args);
      case 'get_nft_metadata':
        return await this.getNftMetadata(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  },

  async nftScan(args: { contract_address: string; token_ids?: string[] }): Promise<any> {
    try {
      // Use the CLI script
      const tokenIdsArgs = args.token_ids ? args.token_ids.join(' ') : '';

      // Execute with contract address and optional token IDs as arguments
      const { stdout, stderr } = await execAsync(
        `node scan-nft-cli.js "${args.contract_address}" ${tokenIdsArgs}`,
        {
          cwd: LIB_CORE_PATH,
          env: {
            ...process.env,
            ...env,  // Use explicitly loaded env vars
            NFT_NETWORK_RPC_URL: env.NFT_NETWORK_RPC_URL || 'https://eth.llamarpc.com',
            NFT_NETWORK_CHAIN_ID: env.NFT_NETWORK_CHAIN_ID || '1',
            NFT_START_TOKEN_ID: env.NFT_START_TOKEN_ID || '0',
            NFT_END_TOKEN_ID: env.NFT_END_TOKEN_ID || '4',
            IPFS_GATEWAY: env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
          },
          timeout: 120000, // 2 minutes
        }
      );

      // Parse result
      const output = stdout + stderr;
      let result;

      try {
        const startMarker = 'SCAN_RESULT_START';
        const endMarker = 'SCAN_RESULT_END';
        const startIdx = output.indexOf(startMarker);
        const endIdx = output.indexOf(endMarker);

        if (startIdx !== -1 && endIdx !== -1) {
          const jsonStr = output.substring(startIdx + startMarker.length, endIdx).trim();
          result = JSON.parse(jsonStr);
        }
      } catch (e) {
        // If parsing fails, try to find JSON in output
        const jsonMatch = output.match(/\{[\s\S]*"nfts"[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        }
      }

      if (result && result.nfts) {
        const nftCount = result.nfts.length;
        const nftList = result.nfts
          .slice(0, 5)
          .map((nft: any) => {
            const metadata = nft.metadata;
            const attributes = metadata?.attributes
              ?.map((attr: any) => `${attr.trait_type}: ${attr.value}`)
              .join(', ');
            return `- **Token ID**: ${nft.tokenId}
  - Owner: ${nft.owner}
  - Name: ${metadata?.name || 'N/A'}
  - Image: ${metadata?.image || 'N/A'}
  ${attributes ? `- Attributes: ${attributes}` : ''}`;
          })
          .join('\n\n');

        // Extract unique IPFS CIDs
        const ipfsCids = new Set<string>();
        result.nfts.forEach((nft: any) => {
          if (nft.tokenURI?.includes('ipfs://')) {
            const cid = nft.tokenURI.replace('ipfs://', '').split('/')[0];
            ipfsCids.add(cid);
          }
          if (nft.metadata?.image?.includes('ipfs://')) {
            const cid = nft.metadata.image.replace('ipfs://', '').split('/')[0];
            ipfsCids.add(cid);
          }
        });

        return {
          content: [
            {
              type: 'text',
              text: `# 📊 NFT 扫描成功

**合约地址**: ${args.contract_address}
**扫描总数**: ${nftCount} 个 NFT

## 📋 NFT 列表 (前 5 个):

${nftList}

${nftCount > 5 ? `\n...*还有 ${nftCount - 5} 个 NFT*\n` : ''}

## 🔗 发现的 IPFS CID:

${Array.from(ipfsCids).map(cid => `- \`${cid}\``).join('\n')}

## 💾 完整数据:

<details>
<summary>点击查看完整 JSON 数据</summary>

\`\`\`json
${JSON.stringify(result, null, 2)}
\`\`\`
</details>`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `# ⚠️ 扫描完成但结果格式异常\n\n输出:\n\`\`\`\n${output}\n\`\`\``,
            },
          ],
        };
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 扫描失败: ${error.message}\n\n${error.stdout ? `stdout:\n\`\`\`\n${error.stdout}\n\`\`\`\n\n` : ''}${error.stderr ? `stderr:\n\`\`\`\n${error.stderr}\n\`\`\`` : ''}`,
          },
        ],
        isError: true,
      };
    }
  },

  async getNftMetadata(args: { contract_address: string; token_id: string }): Promise<any> {
    try {
      // Use the CLI script
      const scriptPath = path.join(LIB_CORE_PATH, 'get-metadata-cli.js');

      // Execute with contract address and token ID as arguments
      const { stdout, stderr } = await execAsync(
        `node get-metadata-cli.js "${args.contract_address}" "${args.token_id}"`,
        {
          cwd: LIB_CORE_PATH,
          env: {
            ...process.env,
            ...env,  // Use explicitly loaded env vars
            NFT_NETWORK_RPC_URL: env.NFT_NETWORK_RPC_URL || 'https://eth.llamarpc.com',
            NFT_NETWORK_CHAIN_ID: env.NFT_NETWORK_CHAIN_ID || '1',
            IPFS_GATEWAY: env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
          },
          timeout: 60000, // 1 minute
        }
      );

      // Parse result
      const output = stdout + stderr;
      let result;

      try {
        const startMarker = 'METADATA_RESULT_START';
        const endMarker = 'METADATA_RESULT_END';
        const startIdx = output.indexOf(startMarker);
        const endIdx = output.indexOf(endMarker);

        if (startIdx !== -1 && endIdx !== -1) {
          const jsonStr = output.substring(startIdx + startMarker.length, endIdx).trim();
          result = JSON.parse(jsonStr);
        }
      } catch (e) {
        // If parsing fails, try to find JSON in output
        const jsonMatch = output.match(/\{[\s\S]*"metadata"[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        }
      }

      if (result && result.metadata) {
        const metadata = result.metadata;
        const attributes = metadata.attributes
          ?.map((attr: any) => `- **${attr.trait_type}**: ${attr.value}`)
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `# 📄 NFT 元数据

**Token ID**: ${args.token_id}
**合约**: ${args.contract_address}
**Owner**: ${result.owner}

## 基本信息

- **名称**: ${metadata.name || 'N/A'}
- **描述**: ${metadata.description || 'N/A'}
- **图像**: ${metadata.image || 'N/A'}

${attributes ? `## 属性\n\n${attributes}` : ''}

## 完整元数据

\`\`\`json
${JSON.stringify(metadata, null, 2)}
\`\`\``,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `# ⚠️ 获取元数据失败\n\n输出:\n\`\`\`\n${output}\n\`\`\``,
            },
          ],
        };
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 获取元数据失败: ${error.message}\n\n${error.stdout ? `stdout:\n\`\`\`\n${error.stdout}\n\`\`\`\n\n` : ''}${error.stderr ? `stderr:\n\`\`\`\n${error.stderr}\n\`\`\`` : ''}`,
          },
        ],
        isError: true,
      };
    }
  },
};
