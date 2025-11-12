import 'dotenv/config';
import { ethers } from 'ethers';

async function testValidationContract() {
  console.log('='.repeat(60));
  console.log('🧪 测试 ERC-8004 Validation 合约');
  console.log('='.repeat(60));

  const provider = new ethers.JsonRpcProvider(
    'https://ethereum-sepolia.publicnode.com',
    undefined,
    { staticNetwork: true }
  );

  const privateKey = process.env.PRIVATE_KEY;
  const signer = new ethers.Wallet(privateKey, provider);
  const signerAddress = await signer.getAddress();

  const identityAddress = '0x7177a6867296406881E20d6647232314736Dd09A';
  const validationAddress = '0x662b40A526cb4017d947e71eAF6753BF3eeE66d8';
  const agentId = 114;

  console.log('\n📋 配置信息:');
  console.log('   Signer:', signerAddress);
  console.log('   Agent ID:', agentId);
  console.log('   Identity Contract:', identityAddress);
  console.log('   Validation Contract:', validationAddress);

  // 1. 验证 Agent 所有权
  console.log('\n👤 1. 验证 Agent 所有权...');
  const identityContract = new ethers.Contract(
    identityAddress,
    ['function ownerOf(uint256 tokenId) external view returns (address)'],
    provider
  );

  try {
    const owner = await identityContract.ownerOf(agentId);
    console.log('   Agent Owner:', owner);
    console.log('   Is Owner:', owner.toLowerCase() === signerAddress.toLowerCase() ? '✅' : '❌');
  } catch (error) {
    console.log('   ❌', error.message);
  }

  // 2. 测试 Validation 合约函数
  console.log('\n📞 2. 测试 Validation 合约函数...');

  const validationAbi = [
    'function requestValidation(uint256 agentId, string calldata workURI, address validator) external returns (bytes32)',
    'function getValidationRequest(bytes32 requestHash) external view returns (uint256, address, address, string, uint8, bool, string, uint256, uint256)',
  ];

  const validationContract = new ethers.Contract(validationAddress, validationAbi, signer);

  // 尝试检查合约代码
  const code = await provider.getCode(validationAddress);
  console.log('   Validation Contract Code Length:', code.length);

  // 测试不同的参数组合
  console.log('\n🧪 3. 测试创建验证请求...');

  const testCases = [
    {
      name: '使用当前地址作为验证者',
      agentId: agentId,
      workURI: 'ipfs://QmTest123',
      validator: signerAddress
    },
    {
      name: '使用零地址作为验证者',
      agentId: agentId,
      workURI: 'ipfs://QmTest123',
      validator: ethers.ZeroAddress
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n   测试: ${testCase.name}`);
    console.log('   Agent ID:', testCase.agentId);
    console.log('   Work URI:', testCase.workURI);
    console.log('   Validator:', testCase.validator);

    try {
      // 只估算 gas，不实际发送
      const gasEstimate = await validationContract.requestValidation.estimateGas(
        testCase.agentId,
        testCase.workURI,
        testCase.validator
      );
      console.log('   ✅ Gas Estimate:', gasEstimate.toString());
    } catch (error) {
      console.log('   ❌ Error:', error.shortMessage || error.message.split('\n')[0]);

      // 尝试获取更详细的错误信息
      if (error.data) {
        console.log('   Error Data:', error.data);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('💡 建议:');
  console.log('   1. 检查 Agent 所有权是否正确');
  console.log('   2. 查看 Etherscan 合约源码了解 require 条件');
  console.log('   3. 尝试不同的参数组合');
  console.log('\n🔗 Etherscan:');
  console.log('   Identity:', `https://sepolia.etherscan.io/address/${identityAddress}#code`);
  console.log('   Validation:', `https://sepolia.etherscan.io/address/${validationAddress}#code`);
}

testValidationContract().catch(console.error);
