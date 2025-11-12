import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const ERC721A_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function totalSupply() view returns (uint256)'
];

async function test() {
  console.log('Testing Azuki contract with updated config...');
  console.log('NFT_NETWORK_RPC_URL:', process.env.NFT_NETWORK_RPC_URL);
  console.log('NFT_CONTRACT_ADDRESS:', process.env.NFT_CONTRACT_ADDRESS);
  
  const provider = new ethers.JsonRpcProvider(
    process.env.NFT_NETWORK_RPC_URL || 'https://eth.llamarpc.com',
    1,
    { staticNetwork: true }
  );
  
  console.log('\nConnected to provider');
  
  const contract = new ethers.Contract(
    process.env.NFT_CONTRACT_ADDRESS || '0xED5AF388653567Af2F388E6224dC7C4b3241C544',
    ERC721A_ABI,
    provider
  );
  
  try {
    console.log('\n1. Getting contract info...');
    const name = await contract.name();
    console.log('  ✅ Name:', name);
    
    const symbol = await contract.symbol();
    console.log('  ✅ Symbol:', symbol);
    
    const totalSupply = await contract.totalSupply();
    console.log('  ✅ Total Supply:', totalSupply.toString());
    
    console.log('\n2. Testing token ID 1...');
    const owner = await contract.ownerOf(1);
    console.log('  ✅ Owner:', owner);
    
    const tokenURI = await contract.tokenURI(1);
    console.log('  ✅ TokenURI:', tokenURI);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('  Data:', error.data);
    }
  }
}

test();
