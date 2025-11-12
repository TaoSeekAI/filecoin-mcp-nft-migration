#!/usr/bin/env node
/**
 * Test upload_to_filecoin with environment variable passing
 */

import { uploadTools } from './build/tools/upload.js';

// Simulate MCP Server environment with all required variables
process.env.PRIVATE_KEY = '0xe4db9f0c28faad37e59e900592a45d2556e3d76137f7a45f83e5740ab35b7e9f';
process.env.VALIDATOR_PRIVATE_KEY = '0xade117fff61d9728ead68bfe8f8a619dbd85b2c9908b0760816dbc0c4f1a45dd';
process.env.NFT_NETWORK_RPC_URL = 'https://eth-mainnet.public.blastapi.io';
process.env.VALIDATION_NETWORK_RPC_URL = 'https://eth-sepolia.public.blastapi.io';
process.env.FILECOIN_NETWORK_RPC_URL = 'https://api.calibration.node.glif.io/rpc/v1';
process.env.IPFS_GATEWAY = 'https://ipfs.io/ipfs/';

async function test() {
  console.log('🧪 Testing upload_to_filecoin with environment variable passing...\n');

  // Test metadata
  const metadata = {
    name: 'Test NFT #0',
    description: 'Test NFT for environment variable validation',
    image: 'ipfs://QmTest/0.png',
    attributes: [
      { trait_type: 'Type', value: 'Test' },
    ],
  };

  console.log('Environment variables:');
  console.log(`  PRIVATE_KEY: ${process.env.PRIVATE_KEY?.substring(0, 10)}...`);
  console.log(`  FILECOIN_NETWORK_RPC_URL: ${process.env.FILECOIN_NETWORK_RPC_URL}`);
  console.log('');

  try {
    console.log('Calling upload_to_filecoin...');
    const result = await uploadTools.handleTool('upload_to_filecoin', {
      nft_token_id: '0',
      metadata: metadata,
      contract_address: '0xED5AF388653567Af2F388E6224dC7C4b3241C544',
    });

    if (result.isError) {
      console.error('❌ Test failed!');
      console.error(result.content[0].text);
      process.exit(1);
    } else {
      console.log('✅ Test passed!\n');
      console.log(result.content[0].text);
    }
  } catch (error) {
    console.error('❌ Test error:', error);
    process.exit(1);
  }
}

test();
