import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function checkLogs() {
  const provider = new ethers.JsonRpcProvider(
    process.env.ETHEREUM_NETWORK_RPC_URL
  );
  
  const txHash = '0x07a3a0f8b3f315544947b56fde87734d6229a5fca01e6c3c726747a290a31c77';
  
  const receipt = await provider.getTransactionReceipt(txHash);
  
  console.log('Transaction:', txHash);
  console.log('Block:', receipt.blockNumber);
  console.log('Status:', receipt.status === 1 ? '✅ Success' : '❌ Failed');
  console.log('\nLogs:');
  
  receipt.logs.forEach((log, i) => {
    console.log(`\nLog ${i}:`);
    console.log('  Address:', log.address);
    console.log('  Topics:', log.topics.length);
    log.topics.forEach((topic, j) => {
      console.log(`    Topic ${j}:`, topic);
    });
    console.log('  Data:', log.data);
  });
}

checkLogs();
