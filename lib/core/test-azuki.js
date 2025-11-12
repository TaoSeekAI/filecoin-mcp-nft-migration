import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const ERC721_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)'
];

async function test() {
  console.log('Testing Azuki contract...');
  console.log('RPC URL:', process.env.NFT_NETWORK_RPC_URL);
  
  const provider = new ethers.JsonRpcProvider(
    process.env.NFT_NETWORK_RPC_URL,
    undefined,
    { staticNetwork: true }
  );
  
  const contract = new ethers.Contract(
    '0xed5af388653567af2f388e6224dc7c4b3241c544',
    ERC721_ABI,
    provider
  );
  
  try {
    const name = await contract.name();
    console.log('✅ Contract name:', name);
    
    const symbol = await contract.symbol();
    console.log('✅ Contract symbol:', symbol);
    
    // Try token 1
    console.log('\nTrying token ID 1...');
    const owner = await contract.ownerOf(1);
    console.log('✅ Owner:', owner);
    
    const tokenURI = await contract.tokenURI(1);
    console.log('✅ TokenURI:', tokenURI);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
