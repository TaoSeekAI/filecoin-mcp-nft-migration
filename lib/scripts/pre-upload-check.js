#!/usr/bin/env node
/**
 * 上传前置检查脚本
 * 验证所有必需的配置和余额
 */

import { ethers } from 'ethers';
import { Synapse } from '@filoz/synapse-sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.FILECOIN_NETWORK_RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1';

async function main() {
  console.log('\n🔍 上传前置检查\n');
  console.log('='.repeat(60));
  
  let allPassed = true;
  
  // 检查 1: 私钥
  console.log('\n1️⃣  检查私钥配置...');
  if (!PRIVATE_KEY) {
    console.log('   ❌ PRIVATE_KEY 未设置！');
    console.log('   请在 .env 文件中设置 PRIVATE_KEY');
    allPassed = false;
  } else if (!PRIVATE_KEY.startsWith('0x') || PRIVATE_KEY.length !== 66) {
    console.log('   ❌ PRIVATE_KEY 格式不正确！');
    console.log('   应该是: 0x + 64位十六进制');
    allPassed = false;
  } else {
    console.log('   ✅ 私钥配置正确');
  }
  
  // 检查 2: SDK 版本
  console.log('\n2️⃣  检查 Synapse SDK 版本...');
  try {
    const packageJson = await import('./package.json', { assert: { type: 'json' } });
    const sdkVersion = packageJson.default.dependencies['@filoz/synapse-sdk'];
    if (sdkVersion.includes('0.33')) {
      console.log(`   ✅ SDK 版本: ${sdkVersion}`);
    } else {
      console.log(`   ⚠️  SDK 版本可能不是最新: ${sdkVersion}`);
      console.log('   建议运行: npm install @filoz/synapse-sdk@latest');
    }
  } catch (error) {
    console.log('   ⚠️  无法检查 SDK 版本');
  }
  
  if (!PRIVATE_KEY || !PRIVATE_KEY.startsWith('0x')) {
    console.log('\n='.repeat(60));
    console.log('❌ 前置检查失败！请修复上述问题后重试。\n');
    process.exit(1);
  }
  
  // 检查 3: 初始化 Synapse
  console.log('\n3️⃣  初始化 Synapse SDK...');
  try {
    const synapse = await Synapse.create({
      privateKey: PRIVATE_KEY,
      rpcURL: RPC_URL,
    });
    console.log('   ✅ Synapse 初始化成功');
    
    // 检查 4: 余额
    console.log('\n4️⃣  检查余额...');
    
    const filBalance = await synapse.payments.walletBalance();
    const filBalanceEth = parseFloat(ethers.formatUnits(filBalance, 18));
    console.log(`   FIL Balance: ${filBalanceEth.toFixed(4)} FIL`);
    
    if (filBalanceEth < 1) {
      console.log('   ⚠️  FIL 余额不足！建议至少 50 FIL');
      allPassed = false;
    } else {
      console.log('   ✅ FIL 余额充足');
    }
    
    const usdfcBalance = await synapse.payments.walletBalance('USDFC');
    const usdfcBalanceEth = parseFloat(ethers.formatUnits(usdfcBalance, 18));
    console.log(`   USDFC (钱包): ${usdfcBalanceEth.toFixed(4)} USDFC`);
    
    const paymentsBalance = await synapse.payments.balance('USDFC');
    const paymentsBalanceEth = parseFloat(ethers.formatUnits(paymentsBalance, 18));
    console.log(`   USDFC (Payments): ${paymentsBalanceEth.toFixed(4)} USDFC`);
    
    if (paymentsBalanceEth < 5) {
      console.log('   ❌ Payments 合约余额不足！');
      console.log('   请运行: node setup-via-sdk.js');
      allPassed = false;
    } else {
      console.log('   ✅ Payments 合约余额充足');
    }
    
    // 检查 5: 服务授权
    console.log('\n5️⃣  检查服务授权...');
    const warmAddr = synapse.getWarmStorageAddress();
    const approval = await synapse.payments.serviceApproval(warmAddr, 'USDFC');
    
    if (approval.rateAllowance > 0n && approval.lockupAllowance > 0n) {
      console.log(`   Rate Allowance: ${ethers.formatUnits(approval.rateAllowance, 18)} USDFC/epoch`);
      console.log(`   Lockup Allowance: ${ethers.formatUnits(approval.lockupAllowance, 18)} USDFC`);
      console.log('   ✅ 服务授权已设置');
    } else {
      console.log('   ❌ 服务授权未设置！');
      console.log('   请运行: node setup-via-sdk.js');
      allPassed = false;
    }
    
  } catch (error) {
    console.log(`   ❌ 错误: ${error.message}`);
    allPassed = false;
  }
  
  // 最终结果
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ 所有检查通过！可以开始上传测试。');
    console.log('\n运行: node test-real-upload-small.js\n');
  } else {
    console.log('❌ 某些检查未通过！请修复上述问题。\n');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ 检查失败:', error.message);
  process.exit(1);
});
