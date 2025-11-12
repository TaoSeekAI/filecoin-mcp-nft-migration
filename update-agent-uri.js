import 'dotenv/config';
import { ethers } from 'ethers';

/**
 * 通过 ERC-8004 Identity 合约更新 Agent 的 URI metadata
 * 用于记录迁移后的新 Filecoin URI
 */
async function updateAgentURI() {
  console.log('='.repeat(60));
  console.log('📝 更新 ERC-8004 Agent URI Metadata');
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
  const agentId = 114;

  console.log('\n📋 配置信息:');
  console.log('   Signer:', signerAddress);
  console.log('   Agent ID:', agentId);
  console.log('   Identity Contract:', identityAddress);

  // Identity 合约 ABI (包含 setMetadata 函数)
  const identityAbi = [
    'function ownerOf(uint256 tokenId) external view returns (address)',
    'function tokenURI(uint256 tokenId) external view returns (string)',
    'function setMetadata(uint256 agentId, string key, bytes value) external',
    'function getMetadata(uint256 agentId, string key) external view returns (bytes)',
    'event MetadataSet(uint256 indexed agentId, string indexed indexedKey, string key, bytes value)'
  ];

  const identityContract = new ethers.Contract(identityAddress, identityAbi, signer);

  // 1. 验证 Agent 所有权
  console.log('\n👤 1. 验证 Agent 所有权...');
  const owner = await identityContract.ownerOf(agentId);
  console.log('   Agent Owner:', owner);
  console.log('   Is Owner:', owner.toLowerCase() === signerAddress.toLowerCase() ? '✅' : '❌');

  if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
    throw new Error('❌ 你不是这个 Agent 的 owner，无法更新 metadata');
  }

  // 2. 读取当前 tokenURI (如果有)
  console.log('\n📖 2. 读取当前 Agent tokenURI...');
  try {
    const currentTokenURI = await identityContract.tokenURI(agentId);
    console.log('   Current tokenURI:', currentTokenURI);
  } catch (error) {
    console.log('   Current tokenURI: (空)');
  }

  // 3. 准备新的 metadata
  console.log('\n📦 3. 准备迁移后的 Filecoin URI metadata...');

  const migrationMetadata = {
    taskType: 'NFT IPFS to Filecoin Migration',
    originalIPFS: 'QmZcH4YvBVVRJtdn4RdbaqgspFU8gH6P9vomDpBVpAL3u4',
    newFilecoinPieceCID: 'bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4',
    newFilecoinURI: 'filecoin://bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4',
    verificationLink: 'https://pdp.vxb.ai/calibration/piece/bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4',
    nftContract: '0xED5AF388653567Af2F388E6224dC7C4b3241C544',
    nftTokenId: '0',
    timestamp: new Date().toISOString()
  };

  console.log('   Migration Metadata:');
  console.log(JSON.stringify(migrationMetadata, null, 2));

  // 4. 设置多个 metadata 键值对
  const metadataUpdates = [
    {
      key: 'filecoin.pieceCID',
      value: migrationMetadata.newFilecoinPieceCID
    },
    {
      key: 'filecoin.uri',
      value: migrationMetadata.newFilecoinURI
    },
    {
      key: 'migration.originalIPFS',
      value: migrationMetadata.originalIPFS
    },
    {
      key: 'migration.timestamp',
      value: migrationMetadata.timestamp
    },
    {
      key: 'migration.nftContract',
      value: migrationMetadata.nftContract
    },
    {
      key: 'migration.complete',
      value: JSON.stringify(migrationMetadata)
    }
  ];

  console.log('\n📤 4. 更新 Agent Metadata...');

  for (const update of metadataUpdates) {
    console.log(`\n   更新 "${update.key}"...`);

    try {
      // 将字符串转换为 bytes
      const valueBytes = ethers.toUtf8Bytes(update.value);

      console.log(`   估算 Gas...`);
      const gasEstimate = await identityContract.setMetadata.estimateGas(
        agentId,
        update.key,
        valueBytes
      );
      console.log(`   ✅ Gas Estimate: ${gasEstimate.toString()}`);

      console.log(`   发送交易...`);
      const tx = await identityContract.setMetadata(
        agentId,
        update.key,
        valueBytes
      );

      console.log(`   Transaction Hash: ${tx.hash}`);
      console.log(`   等待确认...`);

      const receipt = await tx.wait();

      console.log(`   ✅ Metadata 已更新!`);
      console.log(`   Block: ${receipt.blockNumber}`);
      console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
      console.log(`   Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);

    } catch (error) {
      console.error(`   ❌ 更新失败:`, error.message);
    }
  }

  // 5. 验证更新
  console.log('\n🔍 5. 验证 Metadata 更新...');

  for (const update of metadataUpdates) {
    try {
      const storedValue = await identityContract.getMetadata(agentId, update.key);
      const decodedValue = ethers.toUtf8String(storedValue);
      console.log(`\n   ✅ ${update.key}:`);
      console.log(`      ${decodedValue.substring(0, 100)}${decodedValue.length > 100 ? '...' : ''}`);
    } catch (error) {
      console.log(`   ⚠️  ${update.key}: 无法读取`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Agent URI Metadata 更新完成!');
  console.log('='.repeat(60));
  console.log('\n💡 你的 Agent 现在包含了迁移到 Filecoin 的完整记录：');
  console.log('   • Agent ID: 114');
  console.log('   • Filecoin PieceCID: bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4');
  console.log('   • 验证链接: https://pdp.vxb.ai/calibration/piece/...');
  console.log('\n📖 查看你的 Agent:');
  console.log(`   https://sepolia.etherscan.io/token/${identityAddress}?a=${agentId}#inventory`);
}

updateAgentURI().catch(console.error);
