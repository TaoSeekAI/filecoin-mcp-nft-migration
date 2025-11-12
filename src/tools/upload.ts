import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import dotenv from 'dotenv';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const LIB_SCRIPTS_PATH = path.join(PROJECT_ROOT, 'lib/scripts');
const TEMP_PATH = path.join(PROJECT_ROOT, 'temp');

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
 * Upload tools for Filecoin storage operations
 */
export const uploadTools = {
  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'upload_to_filecoin',
        description: '上传 NFT 元数据到 Filecoin，返回 PieceCID',
        inputSchema: {
          type: 'object',
          properties: {
            nft_token_id: {
              type: 'string',
              description: 'NFT Token ID',
            },
            metadata: {
              type: 'object',
              description: 'NFT 元数据对象',
            },
            contract_address: {
              type: 'string',
              description: 'NFT 合约地址',
            },
          },
          required: ['nft_token_id', 'metadata', 'contract_address'],
        },
      },
      {
        name: 'test_upload',
        description: '使用测试数据测试 Filecoin 上传功能',
        inputSchema: {
          type: 'object',
          properties: {
            file_size_mb: {
              type: 'number',
              description: '测试文件大小（MB），默认 1.1',
              default: 1.1,
            },
          },
        },
      },
      {
        name: 'batch_upload_azuki',
        description: '批量上传 Azuki NFT 到 Filecoin',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  },

  hasHandler(toolName: string): boolean {
    return ['upload_to_filecoin', 'test_upload', 'batch_upload_azuki'].includes(toolName);
  },

  async handleTool(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'upload_to_filecoin':
        return await this.uploadToFilecoin(args);
      case 'test_upload':
        return await this.testUpload(args.file_size_mb || 1.1);
      case 'batch_upload_azuki':
        return await this.batchUploadAzuki();
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  },

  async uploadToFilecoin(args: {
    nft_token_id: string;
    metadata: any;
    contract_address: string;
  }): Promise<any> {
    try {
      // Ensure temp directory exists
      await fs.mkdir(TEMP_PATH, { recursive: true });

      // Create a temporary file with metadata
      const tempFile = path.join(TEMP_PATH, `temp-metadata-${args.nft_token_id}.json`);

      // Ensure minimum 1 MB file size
      const MIN_SIZE = 1048576; // 1 MB
      const metadataStr = JSON.stringify(args.metadata, null, 2);
      const paddingNeeded = Math.max(0, MIN_SIZE - metadataStr.length);
      const paddedMetadata = {
        ...args.metadata,
        _padding: 'X'.repeat(paddingNeeded),
      };

      await fs.writeFile(tempFile, JSON.stringify(paddedMetadata, null, 2));

      // Create upload script dynamically (using Synapse SDK directly)
      const uploadScript = `
import { Synapse } from '@filoz/synapse-sdk';
import fs from 'fs/promises';

async function main() {
  // Environment variables are passed from MCP server
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not found in environment');
  }
  if (!process.env.FILECOIN_NETWORK_RPC_URL) {
    throw new Error('FILECOIN_NETWORK_RPC_URL not found in environment');
  }

  const synapse = await Synapse.create({
    privateKey: process.env.PRIVATE_KEY,
    rpcURL: process.env.FILECOIN_NETWORK_RPC_URL,
  });

  const address = await synapse.getSigner().getAddress();
  console.log(\`✅ Wallet: \${address}\`);

  const metadata = JSON.parse(await fs.readFile('${tempFile}', 'utf-8'));
  const dataBuffer = Buffer.from(JSON.stringify(metadata));
  console.log(\`📦 Data size: \${(dataBuffer.length / 1024 / 1024).toFixed(2)} MB\`);

  // Create storage context with retry logic
  console.log('\\n📦 Creating Storage Context...');
  let storageContext = null;
  let attempts = 0;
  const MAX_ATTEMPTS = 3;

  while (!storageContext && attempts < MAX_ATTEMPTS) {
    attempts++;
    console.log(\`   Attempt \${attempts}/\${MAX_ATTEMPTS}...\`);

    try {
      storageContext = await synapse.storage.createContext({
        withCDN: false,
        callbacks: {
          onProviderSelected: (provider) => {
            console.log(\`   ✅ Provider: \${provider.serviceProvider}\`);
          },
          onDataSetResolved: (info) => {
            if (info.isExisting) {
              console.log(\`   📂 Using existing data set: \${info.dataSetId}\`);
            } else {
              console.log(\`   ✨ Creating new data set: \${info.dataSetId}\`);
            }
          },
          onDataSetCreationStarted: (tx) => {
            console.log(\`   📝 Creating data set, tx: \${tx.hash}\`);
          },
          onDataSetCreationProgress: (progress) => {
            if (progress.transactionMined && !progress.dataSetLive) {
              console.log(\`   ⏳ Waiting for data set to be live...\`);
            }
          }
        }
      });

      console.log(\`✅ Storage Context created\`);
      console.log(\`   Data Set ID: \${storageContext.dataSetId}\`);

    } catch (error) {
      console.error(\`   ❌ Attempt \${attempts} failed: \${error.message}\`);
      if (attempts < MAX_ATTEMPTS) {
        console.log(\`   ⏳ Waiting 5 seconds before retry...\`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        throw error;
      }
    }
  }

  if (!storageContext) {
    throw new Error('Failed to create storage context after multiple attempts');
  }

  // Upload to Filecoin
  console.log('\\n📤 Uploading to Filecoin...');
  const uploadResult = await storageContext.upload(dataBuffer, {
    onUploadComplete: (pieceCid) => {
      console.log(\`✅ Upload complete! PieceCID: \${pieceCid}\`);
    },
    onPieceAdded: (tx) => {
      console.log(\`✅ Piece added, tx: \${tx.hash}\`);
    },
    onPieceConfirmed: (pieceIds) => {
      console.log(\`✅ Piece confirmed! IDs: \${pieceIds.join(', ')}\`);
    }
  });

  const result = {
    success: true,
    tokenId: '${args.nft_token_id}',
    contractAddress: '${args.contract_address}',
    pieceCid: uploadResult.pieceCid,
    pieceId: uploadResult.pieceId,
    dataSetId: storageContext.dataSetId,
    size: uploadResult.size,
    uri: \`ipfs://\${uploadResult.pieceCid}\`,
    verificationUrl: \`https://pdp.vxb.ai/calibration/piece/\${uploadResult.pieceCid}\`
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}

main().catch(console.error);
`;

      const scriptPath = path.join(TEMP_PATH, 'temp-upload-script.js');
      await fs.writeFile(scriptPath, uploadScript);

      // Execute upload
      let stdout, stderr;
      try {
        const result = await execAsync('node temp-upload-script.js', {
          cwd: TEMP_PATH,
          env: { ...process.env, ...env }, // Pass explicitly loaded env vars
          timeout: 600000, // 10 minutes
        });
        stdout = result.stdout;
        stderr = result.stderr;

        // Clean up on success
        await fs.unlink(tempFile).catch(() => {});
        await fs.unlink(scriptPath).catch(() => {});
      } catch (error: any) {
        stdout = error.stdout || '';
        stderr = error.stderr || '';
        // Keep temp files on error for debugging
        console.error(`Upload failed. Temp files preserved at:`);
        console.error(`  Script: ${scriptPath}`);
        console.error(`  Metadata: ${tempFile}`);
        throw error;
      }

      // Parse result
      const output = stdout + stderr;
      let uploadResult;

      try {
        // Try to extract JSON result
        const jsonMatch = output.match(/\{[\s\S]*"pieceCid"[\s\S]*\}/);
        if (jsonMatch) {
          uploadResult = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // If parsing fails, return raw output
      }

      if (uploadResult && uploadResult.pieceCid) {
        return {
          content: [
            {
              type: 'text',
              text: `# ✅ 上传成功\n\n**PieceCID**: \`ipfs://${uploadResult.pieceCid}\`\n**Piece ID**: ${uploadResult.pieceId}\n**Data Set ID**: ${uploadResult.dataSetId}\n\n完整输出:\n\`\`\`\n${output}\n\`\`\``,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `# ⚠️ 上传结果不确定\n\n输出:\n\`\`\`\n${output}\n\`\`\``,
            },
          ],
        };
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 上传失败: ${error.message}\n\n输出:\n${error.stdout || ''}\n${error.stderr || ''}`,
          },
        ],
        isError: true,
      };
    }
  },

  async testUpload(fileSizeMb: number): Promise<any> {
    try {
      const { stdout, stderr } = await execAsync('node test-real-upload-small.js', {
        cwd: LIB_SCRIPTS_PATH,
        env: {
          ...process.env,
          ...env, // Use explicitly loaded env vars
          TEST_FILE_SIZE_MB: fileSizeMb.toString(),
        },
        timeout: 600000, // 10 minutes
      });

      const output = stdout + stderr;
      const success = output.includes('PieceCID:') || output.includes('✅');

      return {
        content: [
          {
            type: 'text',
            text: `# 测试上传结果\n\n${output}\n\n${
              success
                ? '✅ 测试上传成功！'
                : '⚠️ 测试上传可能失败或超时，请检查输出。'
            }`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 测试上传失败: ${error.message}\n\n输出:\n${error.stdout || ''}\n${error.stderr || ''}`,
          },
        ],
        isError: true,
      };
    }
  },

  async batchUploadAzuki(): Promise<any> {
    try {
      const { stdout, stderr } = await execAsync('node azuki-full-migration.js', {
        cwd: LIB_SCRIPTS_PATH,
        env: { ...process.env, ...env }, // Use explicitly loaded env vars
        timeout: 600000, // 10 minutes
      });

      const output = stdout + stderr;
      const success = output.includes('✅ Successful Uploads') || output.includes('Backup Summary');

      return {
        content: [
          {
            type: 'text',
            text: `# 批量上传结果\n\n\`\`\`\n${output}\n\`\`\`\n\n${
              success
                ? '✅ 批量上传完成！'
                : '⚠️ 批量上传可能部分失败，请检查输出。'
            }`,
          },
        ],
      };
    } catch (error: any) {
      const output = (error.stdout || '') + (error.stderr || '');
      return {
        content: [
          {
            type: 'text',
            text: `# 批量上传结果\n\n\`\`\`\n${output}\n\`\`\`\n\n${
              output.includes('✅')
                ? '⚠️ 部分成功，请检查输出。'
                : '❌ 批量上传失败'
            }`,
          },
        ],
        isError: !output.includes('✅'),
      };
    }
  },
};
