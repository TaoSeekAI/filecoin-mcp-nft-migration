#!/usr/bin/env node
import { Synapse } from '@filoz/synapse-sdk';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });

const DEPOSIT_AMOUNT = process.env.DEPOSIT_AMOUNT || '35';
const DEPOSIT = ethers.parseUnits(DEPOSIT_AMOUNT, 18);

async function main() {
  console.log('\n🔐 使用 Synapse SDK 设置授权\n');
  
  const synapse = await Synapse.create({
    privateKey: process.env.PRIVATE_KEY,
    rpcURL: 'https://api.calibration.node.glif.io/rpc/v1',
  });
  
  const signer = synapse.getSigner();
  const address = await signer.getAddress();
  console.log(`钱包: ${address}\n`);
  
  // 检查余额
  console.log('💰 检查余额...');
  const usdfcBalance = await synapse.payments.walletBalance('USDFC');
  console.log(`   USDFC (钱包): ${ethers.formatUnits(usdfcBalance, 18)}`);
  
  const paymentsBalance = await synapse.payments.balance('USDFC');
  console.log(`   USDFC (Payments): ${ethers.formatUnits(paymentsBalance, 18)}\n`);
  
  // 存款
  console.log(`💳 存入 ${DEPOSIT_AMOUNT} USDFC...`);
  try {
    const depositTx = await synapse.payments.deposit(DEPOSIT, 'USDFC');
    console.log(`   交易: ${depositTx.hash}`);
    await depositTx.wait();
    console.log('   ✅ 存款成功\n');
    
    const newBalance = await synapse.payments.balance('USDFC');
    console.log(`   新余额: ${ethers.formatUnits(newBalance, 18)} USDFC\n`);
  } catch (error) {
    console.log(`   ❌ 存款失败: ${error.message}\n`);
  }
  
  // 服务授权
  console.log('✅ 设置服务授权...');
  try {
    const RATE = ethers.parseUnits('1', 18);
    const LOCKUP = ethers.parseUnits('50', 18);
    const PERIOD = 86400;
    
    const warmAddr = synapse.getWarmStorageAddress();
    const approveTx = await synapse.payments.approveService(
      warmAddr,
      RATE,
      LOCKUP,
      PERIOD,
      'USDFC'
    );
    console.log(`   交易: ${approveTx.hash}`);
    await approveTx.wait();
    console.log('   ✅ 服务授权成功\n');
  } catch (error) {
    console.log(`   ❌ 服务授权失败: ${error.message}\n`);
  }
  
  console.log('🎉 完成！\n');
}

main().catch(err => {
  console.error('错误:', err);
  process.exit(1);
});
