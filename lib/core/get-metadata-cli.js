/**
 * CLI tool to get NFT metadata
 * Usage: node get-metadata-cli.js <contract_address> <token_id>
 */
import { ethers } from 'ethers';
import { NFTScanner } from './nft-scanner.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

async function main() {
  const contractAddress = process.argv[2];
  const tokenId = process.argv[3];

  if (!contractAddress || !tokenId) {
    console.error('Usage: node get-metadata-cli.js <contract_address> <token_id>');
    process.exit(1);
  }

  const rpcUrl = process.env.NFT_NETWORK_RPC_URL || 'https://eth.llamarpc.com';
  const chainId = process.env.NFT_NETWORK_CHAIN_ID ? parseInt(process.env.NFT_NETWORK_CHAIN_ID) : 1;

  console.log('Fetching metadata for Token ID:', tokenId);
  console.log('Contract:', contractAddress);
  console.log('Using RPC:', rpcUrl);
  console.log('Chain ID:', chainId);

  const provider = new ethers.JsonRpcProvider(
    rpcUrl,
    chainId,
    { staticNetwork: true }
  );

  const scanner = new NFTScanner(
    contractAddress.toLowerCase(),
    provider,
    process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/'
  );

  const info = await scanner.scanToken(tokenId);

  const result = {
    tokenId,
    contract: contractAddress,
    owner: info.owner,
    tokenURI: info.tokenURI,
    metadata: info.metadata,
  };

  console.log('METADATA_RESULT_START');
  console.log(JSON.stringify(result, null, 2));
  console.log('METADATA_RESULT_END');
}

main().catch((error) => {
  console.error('Fetch error:', error);
  process.exit(1);
});
