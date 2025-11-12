import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LIB_CORE_PATH = path.resolve(__dirname, '../../lib/core');

interface Resource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * Resource providers for querying migration status, balances, and contracts
 */
export const resourceProviders = {
  getResourceList(): Resource[] {
    return [
      {
        uri: 'nft-migration://status',
        name: 'Migration Status',
        description: '当前迁移任务的状态',
        mimeType: 'application/json',
      },
      {
        uri: 'nft-migration://balances',
        name: 'Wallet Balances',
        description: '钱包余额（FIL、USDFC、Payments）',
        mimeType: 'application/json',
      },
      {
        uri: 'nft-migration://contracts',
        name: 'Contract Addresses',
        description: 'Filecoin 合约地址（Payments、Warm Storage、USDFC）',
        mimeType: 'application/json',
      },
      {
        uri: 'nft-migration://environment',
        name: 'Environment Info',
        description: '环境配置信息（RPC URLs、钱包地址）',
        mimeType: 'application/json',
      },
    ];
  },

  async readResource(uri: string): Promise<any> {
    switch (uri) {
      case 'nft-migration://status':
        return await this.getMigrationStatus();
      case 'nft-migration://balances':
        return await this.getBalances();
      case 'nft-migration://contracts':
        return await this.getContracts();
      case 'nft-migration://environment':
        return await this.getEnvironment();
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  },

  async getMigrationStatus(): Promise<any> {
    try {
      // Check if workflow state file exists
      const stateFile = path.join(LIB_CORE_PATH, 'workflow-state.json');
      try {
        const stateData = await fs.readFile(stateFile, 'utf-8');
        return {
          status: 'active',
          state: JSON.parse(stateData),
          lastUpdated: new Date().toISOString(),
        };
      } catch (e) {
        return {
          status: 'idle',
          message: '没有正在进行的迁移任务',
          lastUpdated: new Date().toISOString(),
        };
      }
    } catch (error: any) {
      throw new Error(`Failed to get migration status: ${error.message}`);
    }
  },

  async getBalances(): Promise<any> {
    try {
      const { stdout } = await execAsync('node check-balances.js', {
        cwd: LIB_CORE_PATH,
        env: process.env,
      });

      // Parse output
      const lines = stdout.split('\n');
      const balances: any = {
        wallet: process.env.WALLET_ADDRESS || 'N/A',
        lastUpdated: new Date().toISOString(),
      };

      // Extract balances from output
      lines.forEach((line) => {
        if (line.includes('FIL:')) {
          balances.fil = line.split(':')[1]?.trim();
        }
        if (line.includes('USDFC (钱包):')) {
          balances.usdfc_wallet = line.split(':')[1]?.trim();
        }
        if (line.includes('USDFC (Payments):')) {
          balances.usdfc_payments = line.split(':')[1]?.trim();
        }
      });

      return balances;
    } catch (error: any) {
      return {
        error: error.message,
        wallet: process.env.WALLET_ADDRESS || 'N/A',
        lastUpdated: new Date().toISOString(),
      };
    }
  },

  async getContracts(): Promise<any> {
    try {
      const { stdout } = await execAsync('node get-real-addresses.js', {
        cwd: LIB_CORE_PATH,
        env: process.env,
      });

      const lines = stdout.split('\n');
      const contracts: any = {
        network: 'Filecoin Calibration',
        lastUpdated: new Date().toISOString(),
      };

      // Extract contract addresses
      lines.forEach((line) => {
        if (line.includes('Payments:')) {
          contracts.payments = line.split(':')[1]?.trim();
        }
        if (line.includes('Warm Storage:')) {
          contracts.warmStorage = line.split(':')[1]?.trim();
        }
        if (line.includes('USDFC:')) {
          contracts.usdfc = line.split(':')[1]?.trim();
        }
      });

      return contracts;
    } catch (error: any) {
      return {
        error: error.message,
        network: 'Filecoin Calibration',
        lastUpdated: new Date().toISOString(),
      };
    }
  },

  async getEnvironment(): Promise<any> {
    return {
      ethereum: {
        mainnet_rpc: process.env.NFT_NETWORK_RPC_URL || 'N/A',
        mainnet_chain_id: process.env.NFT_NETWORK_CHAIN_ID || 'N/A',
        mainnet_name: process.env.NFT_NETWORK_NAME || 'N/A',
        sepolia_rpc: process.env.VALIDATION_NETWORK_RPC_URL || 'N/A',
        sepolia_chain_id: process.env.VALIDATION_NETWORK_CHAIN_ID || 'N/A',
        sepolia_name: process.env.VALIDATION_NETWORK_NAME || 'N/A',
      },
      filecoin: {
        calibration_rpc: process.env.FILECOIN_NETWORK_RPC_URL || 'N/A',
        calibration_chain_id: process.env.FILECOIN_NETWORK_CHAIN_ID || 'N/A',
        calibration_name: process.env.FILECOIN_NETWORK_NAME || 'N/A',
      },
      wallet: {
        address: process.env.WALLET_ADDRESS || 'N/A',
        hasPrivateKey: !!process.env.PRIVATE_KEY,
        hasValidatorKey: !!process.env.VALIDATOR_PRIVATE_KEY,
      },
      contracts: {
        nft: process.env.NFT_CONTRACT_ADDRESS || 'N/A',
        agent_identity: process.env.AGENT_IDENTITY_ADDRESS || 'N/A',
        agent_reputation: process.env.AGENT_REPUTATION_ADDRESS || 'N/A',
        agent_validation: process.env.AGENT_VALIDATION_ADDRESS || 'N/A',
      },
      ipfs: {
        gateway: process.env.IPFS_GATEWAY || 'N/A',
      },
      proxy: {
        http: process.env.HTTP_PROXY ? 'Configured' : 'Not configured',
        https: process.env.HTTPS_PROXY ? 'Configured' : 'Not configured',
      },
      lastUpdated: new Date().toISOString(),
    };
  },
};
