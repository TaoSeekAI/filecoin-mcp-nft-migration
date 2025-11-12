#!/usr/bin/env node

/**
 * Scan Azuki NFT Contract
 * Azuki Contract Address: 0xED5AF388653567Af2F388E6224dC7C4b3241C544
 */

import { ethers } from 'ethers';
import { NFTScanner } from './nft-scanner.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🎌 Azuki NFT Scanner');
  console.log('=' .repeat(60));

  // Azuki contract address
  const AZUKI_CONTRACT = '0xED5AF388653567Af2F388E6224dC7C4b3241C544';

  // Connect to Ethereum mainnet
  const rpcUrl = process.env.NFT_NETWORK_RPC_URL || 'https://eth-mainnet.public.blastapi.io';
  console.log(`\n🔗 Connecting to: ${rpcUrl}`);

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Test connection
  try {
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ Connected! Current block: ${blockNumber}`);
  } catch (error) {
    console.error('❌ Failed to connect to Ethereum network:', error.message);
    process.exit(1);
  }

  // Create scanner
  const scanner = new NFTScanner(AZUKI_CONTRACT, provider);

  // Scan first 5 tokens (can be adjusted)
  const startToken = 0;
  const endToken = 4;

  console.log(`\n📊 Scanning tokens ${startToken} to ${endToken}...`);

  try {
    const result = await scanner.scan(startToken, endToken);

    console.log('\n✅ Scan complete!');
    console.log('\n📋 Full Results:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('\n❌ Scan failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main().catch(console.error);
