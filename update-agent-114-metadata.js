import 'dotenv/config';
import { ethers } from 'ethers';

/**
 * 更新 Agent 114 的 metadata，记录 Filecoin 迁移信息
 */
async function updateAgentMetadata() {
  console.log('='.repeat(60));
  console.log('📝 更新 Agent 114 Metadata - Filecoin 迁移记录');
  console.log('='.repeat(60));

  const provider = new ethers.JsonRpcProvider(
    process.env.VALIDATION_NETWORK_RPC_URL || process.env.ETHEREUM_NETWORK_RPC_URL || 'https://ethereum-sepolia.publicnode.com',
    undefined,
    { staticNetwork: true }
  );

  const privateKey = process.env.VALIDATOR_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('❌ 未找到私钥环境变量 (PRIVATE_KEY 或 VALIDATOR_PRIVATE_KEY)');
  }

  const signer = new ethers.Wallet(privateKey, provider);
  const signerAddress = await signer.getAddress();

  const identityAddress = process.env.AGENT_IDENTITY_ADDRESS || '0x7177a6867296406881E20d6647232314736Dd09A';
  const agentId = 114;

  console.log('\n📋 配置信息:');
  console.log('   Signer:', signerAddress);
  console.log('   Agent ID:', agentId);
  console.log('   Identity Contract:', identityAddress);
  console.log('   Network:', await provider.getNetwork().then(n => n.name));

  // Identity 合约 ABI
  const identityAbi = [
    'function ownerOf(uint256 tokenId) external view returns (address)',
    'function setMetadata(uint256 agentId, string key, bytes value) external',
    'function getMetadata(uint256 agentId, string key) external view returns (bytes)',
  ];

  const identityContract = new ethers.Contract(identityAddress, identityAbi, signer);

  // 1. 验证 Agent 所有权
  console.log('\n👤 1. 验证 Agent 所有权...');
  const owner = await identityContract.ownerOf(agentId);
  console.log('   Agent Owner:', owner);
  console.log('   Current Signer:', signerAddress);
  console.log('   Is Owner:', owner.toLowerCase() === signerAddress.toLowerCase() ? '✅' : '❌');

  if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
    throw new Error('❌ 你不是这个 Agent 的 owner，无法更新 metadata');
  }

  // 2. 准备要更新的 metadata
  console.log('\n📦 2. 准备 Filecoin 迁移 Metadata...');

  const metadataUpdates = [
    {
      key: 'filecoin.pieceCID',
      value: 'bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4'
    },
    {
      key: 'filecoin.uri',
      value: 'filecoin://bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4'
    },
    {
      key: 'migration.original_ipfs',
      value: 'QmZcH4YvBVVRJtdn4RdbaqgspFU8gH6P9vomDpBVpAL3u4'
    }
  ];

  console.log('   要更新的字段数:', metadataUpdates.length);
  metadataUpdates.forEach(({ key, value }) => {
    console.log(`   - ${key}: ${value.length > 60 ? value.substring(0, 60) + '...' : value}`);
  });

  // 3. 执行更新
  console.log('\n📤 3. 更新 Agent Metadata...');

  const results = [];
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

      results.push({
        key: update.key,
        value: update.value,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        success: true
      });

    } catch (error) {
      console.error(`   ❌ 更新失败:`, error.message);
      results.push({
        key: update.key,
        value: update.value,
        error: error.message,
        success: false
      });
    }
  }

  // 4. 验证更新
  console.log('\n🔍 4. 验证 Metadata 更新...');

  for (const update of metadataUpdates) {
    try {
      const storedValue = await identityContract.getMetadata(agentId, update.key);
      const decodedValue = ethers.toUtf8String(storedValue);
      const verified = decodedValue === update.value;
      console.log(`\n   ${verified ? '✅' : '❌'} ${update.key}:`);
      if (verified) {
        console.log(`      已验证: ${decodedValue.substring(0, 80)}${decodedValue.length > 80 ? '...' : ''}`);
      } else {
        console.log(`      期望: ${update.value.substring(0, 50)}...`);
        console.log(`      实际: ${decodedValue.substring(0, 50)}...`);
      }
    } catch (error) {
      console.log(`   ⚠️  ${update.key}: 无法读取`);
    }
  }

  // 5. 总结
  console.log('\n' + '='.repeat(60));
  console.log('✅ Agent 114 Metadata 更新完成!');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const successRate = Math.round((successful / results.length) * 100);

  console.log(`\n📊 更新统计:`);
  console.log(`   总数: ${results.length}`);
  console.log(`   成功: ${successful} (${successRate}%)`);
  console.log(`   失败: ${failed}`);

  if (successful > 0) {
    console.log('\n📝 已记录的信息:');
    console.log('   • Filecoin PieceCID: bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4');
    console.log('   • Filecoin URI: filecoin://bafkzcibexcat6ehc2szp5auddkojtvytj7d5bli2b2aq7epzpfmpx6c4kcrqp6mwg4');
    console.log('   • Original IPFS: QmZcH4YvBVVRJtdn4RdbaqgspFU8gH6P9vomDpBVpAL3u4');

    console.log('\n🔗 查看你的 Agent:');
    console.log(`   Etherscan Token: https://sepolia.etherscan.io/token/${identityAddress}?a=${agentId}`);
    console.log(`   Etherscan NFT: https://sepolia.etherscan.io/nft/${identityAddress}/${agentId}`);

    console.log('\n🎉 完成！');
    console.log('   你的 Agent metadata 已成功更新并记录在 Sepolia 区块链上！');
    console.log('   Azuki #0 到 Filecoin 的迁移信息现在可以通过链上查询了。');
  }
}

updateAgentMetadata().catch(console.error);
