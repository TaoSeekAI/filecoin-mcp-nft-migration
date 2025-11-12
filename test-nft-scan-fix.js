#!/usr/bin/env node
/**
 * Test the fixed nft_scan MCP tool
 */

import { nftTools } from './build/tools/nft.js';

async function test() {
  console.log('🧪 Testing fixed nft_scan tool...\n');

  try {
    console.log('Testing nft_scan with Azuki contract...');
    const result = await nftTools.handleTool('nft_scan', {
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
