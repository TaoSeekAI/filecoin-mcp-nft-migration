/**
 * CLI tool to scan NFT contract
 * Usage: node scan-nft-cli.js <contract_address> [token_ids...]
 */
import { ethers } from 'ethers';
import { NFTScanner } from './nft-scanner.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

async function main() {
  const contractAddress = process.argv[2];
  const tokenIdsArg = process.argv.slice(3);

  if (!contractAddress) {
    console.error('Usage: node scan-nft-cli.js <contract_address> [token_ids...]');
    process.exit(1);
  }

  const rpcUrl = process.env.NFT_NETWORK_RPC_URL || 'https://eth.llamarpc.com';
  const chainId = process.env.NFT_NETWORK_CHAIN_ID ? parseInt(process.env.NFT_NETWORK_CHAIN_ID) : 1;
  const startTokenId = process.env.NFT_START_TOKEN_ID || '0';
  const endTokenId = process.env.NFT_END_TOKEN_ID || '4';

  console.log('Scanning contract:', contractAddress);
  console.log('Using RPC:', rpcUrl);
  console.log('Chain ID:', chainId);

  // Determine token IDs to scan
  let tokenIds;
  if (tokenIdsArg.length > 0) {
    tokenIds = tokenIdsArg;
    console.log('Token IDs:', tokenIds);
  } else {
    const start = parseInt(startTokenId);
    const end = parseInt(endTokenId);
    tokenIds = Array.from({ length: end - start + 1 }, (_, i) => (start + i).toString());
    console.log('Token range:', start, '-', end);
  }

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

  const nfts = [];

  for (const tokenId of tokenIds) {
    try {
      const info = await scanner.scanToken(tokenId);
      if (info) {
        nfts.push({
          tokenId,
          owner: info.owner,
          tokenURI: info.tokenURI,
          metadata: info.metadata,
        });
      }
    } catch (error) {
      console.error(`Failed to scan token ${tokenId}:`, error.message);
    }
  }

  const result = {
    contract: contractAddress,
    totalScanned: nfts.length,
    nfts,
  };

  console.log('SCAN_RESULT_START');
  console.log(JSON.stringify(result, null, 2));
  console.log('SCAN_RESULT_END');
}

main().catch((error) => {
  console.error('Scan error:', error);
  process.exit(1);
});
