import 'dotenv/config';
import { ethers } from 'ethers';

async function testSepoliaConfig() {
  console.log('='.repeat(60));
  console.log('🧪 Sepolia 测试网配置测试');
  console.log('='.repeat(60));

  // 测试多个 Sepolia RPC
  const rpcUrls = [
    { name: 'PublicNode', url: 'https://ethereum-sepolia.publicnode.com' },
    { name: 'BlastAPI', url: 'https://eth-sepolia.public.blastapi.io' },
    { name: 'Sepolia.org', url: 'https://rpc.sepolia.org' },
    { name: 'Sepolia2', url: 'https://rpc2.sepolia.org' }
  ];

  const contracts = {
    identity: '0x7177a6867296406881E20d6647232314736Dd09A',
    validation: '0x662b40A526cb4017d947e71eAF6753BF3eeE66d8',
    reputation: '0xB5048e3ef1DA4E04deB6f7d0423D06F63869e322'
  };

  let workingRpc = null;
  let provider = null;

  // 1. 测试 RPC 连接
  console.log('\n📡 1. 测试 RPC 连接...');
  for (const rpc of rpcUrls) {
    try {
      console.log(`\n   测试: ${rpc.name} (${rpc.url})`);
      const testProvider = new ethers.JsonRpcProvider(rpc.url, undefined, { staticNetwork: true });

      const blockNumber = await testProvider.getBlockNumber();
      console.log(`   ✅ 连接成功! 当前区块: ${blockNumber}`);

      if (!workingRpc) {
        workingRpc = rpc;
        provider = testProvider;
      }
    } catch (error) {
      console.log(`   ❌ 连接失败: ${error.message}`);
    }
  }

  if (!provider) {
    console.log('\n❌ 所有 RPC 连接都失败了！');
    return;
  }

  console.log(`\n✅ 使用 RPC: ${workingRpc.name} (${workingRpc.url})`);

  // 2. 测试合约部署
  console.log('\n🔍 2. 检查合约部署...');
  for (const [name, address] of Object.entries(contracts)) {
    try {
      const code = await provider.getCode(address);
      const exists = code !== '0x';
      console.log(`   ${name}: ${address}`);
      console.log(`   ${exists ? '✅' : '❌'} 合约 ${exists ? '已部署' : '未部署'} (代码长度: ${code.length})`);
    } catch (error) {
      console.log(`   ❌ ${name} 检查失败: ${error.message}`);
    }
  }

  // 3. 测试合约调用 - Agent Identity
  console.log('\n📞 3. 测试 Agent Identity 合约调用...');
  try {
    const identityAbi = [
      'function name() external view returns (string)',
      'function symbol() external view returns (string)',
      'function totalSupply() external view returns (uint256)'
    ];

    const identityContract = new ethers.Contract(contracts.identity, identityAbi, provider);

    try {
      const name = await identityContract.name();
      console.log(`   ✅ Name: ${name}`);
    } catch (e) {
      console.log('   ⚠️  name() 不可用');
    }

    try {
      const symbol = await identityContract.symbol();
      console.log(`   ✅ Symbol: ${symbol}`);
    } catch (e) {
      console.log('   ⚠️  symbol() 不可用');
    }

    try {
      const totalSupply = await identityContract.totalSupply();
      console.log(`   ✅ Total Supply: ${totalSupply.toString()}`);
    } catch (e) {
      console.log('   ⚠️  totalSupply() 不可用');
    }
  } catch (error) {
    console.log(`   ❌ 合约调用失败: ${error.message}`);
  }

  // 4. 测试钱包配置
  console.log('\n👛 4. 测试钱包配置...');
  try {
    const privateKey = process.env.PRIVATE_KEY || process.env.VALIDATOR_PRIVATE_KEY;
    if (!privateKey || privateKey === 'your_private_key_here') {
      console.log('   ❌ 私钥未配置或使用占位符');
    } else {
      const wallet = new ethers.Wallet(privateKey, provider);
      const address = await wallet.getAddress();
      const balance = await provider.getBalance(address);

      console.log(`   ✅ 钱包地址: ${address}`);
      console.log(`   ✅ Sepolia ETH 余额: ${ethers.formatEther(balance)} ETH`);

      if (balance === 0n) {
        console.log('   ⚠️  余额为 0，需要从水龙头获取测试币');
        console.log('   💧 水龙头: https://sepoliafaucet.com/');
      }
    }
  } catch (error) {
    console.log(`   ❌ 钱包测试失败: ${error.message}`);
  }

  // 5. 输出推荐配置
  console.log('\n' + '='.repeat(60));
  console.log('📋 推荐的 Sepolia 配置:');
  console.log('='.repeat(60));
  console.log(`
# Sepolia 测试网配置
ETHEREUM_NETWORK_RPC_URL=${workingRpc.url}
VALIDATION_NETWORK_RPC_URL=${workingRpc.url}
CHAIN_ID=11155111

# ERC-8004 合约地址 (Sepolia)
AGENT_IDENTITY_ADDRESS=${contracts.identity}
AGENT_VALIDATION_ADDRESS=${contracts.validation}
AGENT_REPUTATION_ADDRESS=${contracts.reputation}

# 钱包配置 (需要配置您的私钥)
PRIVATE_KEY=your_private_key_here
VALIDATOR_PRIVATE_KEY=your_private_key_here
  `);
}

testSepoliaConfig().catch(console.error);
