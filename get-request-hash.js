import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const VALIDATION_ABI = [
  'event ValidationRequested(bytes32 indexed requestHash, address indexed requester, uint256 indexed agentId, address validator, string taskURI)'
];

async function getRequestHash() {
  const provider = new ethers.JsonRpcProvider(
    process.env.ETHEREUM_NETWORK_RPC_URL
  );
  
  const txHash = '0x07a3a0f8b3f315544947b56fde87734d6229a5fca01e6c3c726747a290a31c77';
  
  console.log('Querying transaction:', txHash);
  
  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      console.log('❌ Transaction not found');
      return;
    }
    
    console.log('✅ Transaction confirmed in block:', receipt.blockNumber);
    console.log('Total logs:', receipt.logs.length);
    
    // Parse logs for ValidationRequested event
    const iface = new ethers.Interface(VALIDATION_ABI);
    
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed && parsed.name === 'ValidationRequested') {
          console.log('\n🎉 Found ValidationRequested event:');
          console.log('   Request Hash:', parsed.args.requestHash);
          console.log('   Requester:', parsed.args.requester);
          console.log('   Agent ID:', parsed.args.agentId.toString());
          console.log('   Validator:', parsed.args.validator);
          console.log('   Task URI:', parsed.args.taskURI);
          return parsed.args.requestHash;
        }
      } catch (e) {
        // Skip logs that don't match
      }
    }
    
    console.log('⚠️  No ValidationRequested event found');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getRequestHash();
