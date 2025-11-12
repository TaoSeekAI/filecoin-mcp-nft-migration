import 'dotenv/config';
import { ethers } from 'ethers';

async function testContractABI() {
  console.log('='.repeat(60));
  console.log('🧪 测试 ERC-8004 合约 ABI');
  console.log('='.repeat(60));

  const provider = new ethers.JsonRpcProvider(
    'https://ethereum-sepolia.publicnode.com',
    undefined,
    { staticNetwork: true }
  );

  const contractAddress = '0x7177a6867296406881E20d6647232314736Dd09A';

  // 测试不同的函数签名
  const testFunctions = [
    // ERC-721 标准
    'function name() external view returns (string)',
    'function symbol() external view returns (string)',
    'function totalSupply() external view returns (uint256)',
    'function balanceOf(address owner) external view returns (uint256)',

    // ERC-8004 可能的函数
    'function register(string calldata metadataURI) external payable returns (uint256)',
    'function register(string calldata metadataURI) external returns (uint256)',
    'function mint(string calldata metadataURI) external payable returns (uint256)',
    'function mint(string calldata metadataURI) external returns (uint256)',
    'function registrationFee() external view returns (uint256)',
  ];

  console.log('\n📞 测试合约函数...\n');

  for (const funcSig of testFunctions) {
    try {
      const contract = new ethers.Contract(contractAddress, [funcSig], provider);
      const funcName = funcSig.match(/function (\w+)/)[1];

      // 只测试 view 函数
      if (funcSig.includes('view')) {
        if (funcName === 'balanceOf') {
          // 使用零地址测试
          const result = await contract[funcName](ethers.ZeroAddress);
          console.log(`✅ ${funcName}(): ${result.toString()}`);
        } else {
          const result = await contract[funcName]();
          console.log(`✅ ${funcName}(): ${result.toString()}`);
        }
      } else {
        // 非 view 函数，只检查 ABI 是否匹配
        console.log(`⚪ ${funcSig.match(/function ([^)]+\))/)[1]} - 需要交易才能测试`);
      }
    } catch (error) {
      const funcName = funcSig.match(/function (\w+)/)[1];
      console.log(`❌ ${funcName}() - ${error.message.split('\n')[0]}`);
    }
  }

  // 获取合约代码
  console.log('\n📄 合约代码信息:');
  const code = await provider.getCode(contractAddress);
  console.log(`   代码长度: ${code.length} 字节`);
  console.log(`   合约地址: ${contractAddress}`);
  console.log(`   Etherscan: https://sepolia.etherscan.io/address/${contractAddress}#code`);
}

testContractABI().catch(console.error);
