import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const AGENT_IDENTITY_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
];

async function getAgentIdFromTx() {
  const provider = new ethers.JsonRpcProvider(
    process.env.ETHEREUM_NETWORK_RPC_URL
  );
  
  const txHash = '0x9a8bf5638e62f4ec72bae6653f60d41bde1d52656d9a2f37bbb4a1cc029d95ee';
  
  console.log('Querying transaction:', txHash);
  
  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      console.log('❌ Transaction not found');
      return;
    }
    
    console.log('✅ Transaction confirmed in block:', receipt.blockNumber);
    console.log('Total logs:', receipt.logs.length);
    
    // Parse logs for Transfer event
    const iface = new ethers.Interface(AGENT_IDENTITY_ABI);
    
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed && parsed.name === 'Transfer') {
          console.log('\n🎉 Found Transfer event:');
          console.log('   From:', parsed.args.from);
          console.log('   To:', parsed.args.to);
          console.log('   Agent ID (Token ID):', parsed.args.tokenId.toString());
          return parsed.args.tokenId.toString();
        }
      } catch (e) {
        // Skip logs that don't match
      }
    }
    
    console.log('⚠️  No Transfer event found in transaction');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getAgentIdFromTx();
