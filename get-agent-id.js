import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const AGENT_IDENTITY_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)'
];

async function getAgentId() {
  const provider = new ethers.JsonRpcProvider(
    process.env.ETHEREUM_NETWORK_RPC_URL
  );
  
  const contract = new ethers.Contract(
    process.env.AGENT_IDENTITY_ADDRESS,
    AGENT_IDENTITY_ABI,
    provider
  );
  
  // Use the owner address from registration output
  const address = '0xf3E6B8c07d7369f78e85b1139C81B54710e57846';
  
  console.log('Querying Agent ID for address:', address);
  console.log('Contract:', process.env.AGENT_IDENTITY_ADDRESS);
  
  try {
    const balance = await contract.balanceOf(address);
    console.log('Total agents owned:', balance.toString());
    
    if (balance > 0n) {
      // Get the last agent (most recently registered)
      const lastIndex = Number(balance) - 1;
      const agentId = await contract.tokenOfOwnerByIndex(address, lastIndex);
      console.log('\n✅ Latest Agent ID:', agentId.toString());
      return agentId.toString();
    } else {
      console.log('⚠️  No agents found for this address');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getAgentId();
