import 'dotenv/config';
import { ethers } from 'ethers';

async function submitValidation() {
  console.log('='.repeat(60));
  console.log('📤 提交 ERC-8004 验证结果');
  console.log('='.repeat(60));

  const provider = new ethers.JsonRpcProvider(
    'https://ethereum-sepolia.publicnode.com',
    undefined,
    { staticNetwork: true }
  );

  const privateKey = process.env.PRIVATE_KEY;
  const signer = new ethers.Wallet(privateKey, provider);
  const signerAddress = await signer.getAddress();

  const validationAddress = '0x662b40A526cb4017d947e71eAF6753BF3eeE66d8';
  const requestHash = '0x44284B8BC1D2C35AA15664964367AB139B7A447DB27D56C3D450E748EA94AA5B';

  console.log('\n📋 验证信息:');
  console.log('   Signer:', signerAddress);
  console.log('   Request Hash:', requestHash);
  console.log('   Validation Contract:', validationAddress);

  // 创建验证证明 metadata
  const proofMetadata = {
    task: 'NFT IPFS to Filecoin Migration',
    nft: {
      contract: '0xED5AF388653567Af2F388E6224dC7C4b3241C544',
      tokenId: '0',
      name: 'Azuki #0'
    },
    migration: {
      originalIPFS: 'QmZcH4YvBVVRJtdn4RdbaqgspFU8gH6P9vomDpBVpAL3u4',
      filecoinPieceCID: 'bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4',
      verificationLink: 'https://pdp.vxb.ai/calibration/piece/bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4',
      success: true
    },
    verificationMethod: 'On-chain storage proof via Synapse SDK',
    timestamp: new Date().toISOString()
  };

  // 将 proof metadata 转换为 JSON 字符串并创建 proof URI
  const proofJSON = JSON.stringify(proofMetadata, null, 2);
  console.log('\n📄 验证证明:');
  console.log(proofJSON);

  // 使用简单的 data URI 或者 IPFS CID placeholder
  const proofURI = `data:application/json;base64,${Buffer.from(proofJSON).toString('base64')}`;

  console.log('\n📍 Proof URI Length:', proofURI.length);

  // 创建合约实例
  const validationAbi = [
    'function submitValidation(bytes32 requestHash, bool isValid, string calldata proofURI) external',
    'function getValidationRequest(bytes32 requestHash) external view returns (uint256, address, address, string, uint8, bool, string, uint256, uint256)'
  ];

  const validationContract = new ethers.Contract(validationAddress, validationAbi, signer);

  // 检查当前验证请求状态
  console.log('\n🔍 检查验证请求状态...');
  try {
    const request = await validationContract.getValidationRequest(requestHash);
    const statusNames = ['Pending', 'Completed', 'Expired'];
    console.log('   Status:', statusNames[Number(request[4])] || 'Unknown');
    console.log('   Agent ID:', Number(request[0]));
    console.log('   Validator:', request[2]);
    console.log('   Requester:', request[1]);
  } catch (error) {
    console.log('   ⚠️ 无法获取请求状态:', error.message);
  }

  // 提交验证结果
  console.log('\n📤 提交验证结果...');
  console.log('   Request Hash:', requestHash);
  console.log('   Is Valid: ✅ true');
  console.log('   Proof URI: [Base64 encoded JSON]');

  try {
    console.log('\n   估算 Gas...');
    const gasEstimate = await validationContract.submitValidation.estimateGas(
      requestHash,
      true,
      proofURI
    );
    console.log('   ✅ Gas Estimate:', gasEstimate.toString());

    console.log('\n   发送交易...');
    const tx = await validationContract.submitValidation(
      requestHash,
      true,
      proofURI
    );

    console.log('   Transaction Hash:', tx.hash);
    console.log('   Waiting for confirmation...');

    const receipt = await tx.wait();

    console.log('\n✅ 验证结果已提交!');
    console.log('   Transaction:', tx.hash);
    console.log('   Block:', receipt.blockNumber);
    console.log('   Gas Used:', receipt.gasUsed.toString());
    console.log('\n🔗 Etherscan:');
    console.log(`   https://sepolia.etherscan.io/tx/${tx.hash}`);

    // 再次检查状态
    console.log('\n🔍 验证最终状态...');
    const finalRequest = await validationContract.getValidationRequest(requestHash);
    const statusNames = ['Pending', 'Completed', 'Expired'];
    console.log('   Status:', statusNames[Number(finalRequest[4])]);
    console.log('   Is Valid:', finalRequest[5]);
    console.log('   Proof URI:', finalRequest[6].substring(0, 100) + '...');

  } catch (error) {
    console.error('\n❌ 提交失败:', error.message);
    if (error.data) {
      console.log('   Error Data:', error.data);
    }
    throw error;
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ ERC-8004 验证流程完成!');
  console.log('='.repeat(60));
}

submitValidation().catch(console.error);
