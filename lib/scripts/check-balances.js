/**
 * Check All Balances for New Wallet
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { Synapse } from '@filoz/synapse-sdk';

const USDFC_ADDRESS = '0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0';
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

async function checkAllBalances() {
  console.log('💰 Checking All Test Token Balances\n');
  console.log('='.repeat(80));

  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
  const address = wallet.address;

  console.log(`\n📋 Wallet Address: ${address}\n`);

  // Check Sepolia ETH
  console.log('1️⃣  Sepolia ETH (for ERC-8004 contracts)');
  console.log('-'.repeat(80));
  try {
    const sepoliaRpcUrl = process.env.ETHEREUM_NETWORK_RPC_URL || process.env.RPC_URL || 'https://eth-sepolia.public.blastapi.io';
    const sepoliaProvider = new ethers.JsonRpcProvider(sepoliaRpcUrl);
    const sepoliaBalance = await sepoliaProvider.getBalance(address);
    const sepoliaEth = ethers.formatEther(sepoliaBalance);

    console.log(`   Balance: ${sepoliaEth} ETH`);
    if (Number(sepoliaEth) >= 0.1) {
      console.log('   ✅ Sufficient for testing');
    } else if (Number(sepoliaEth) > 0) {
      console.log('   ⚠️  Low balance - get more from faucet');
    } else {
      console.log('   ❌ No balance - get Sepolia ETH from faucet');
      console.log('   Faucet: https://sepoliafaucet.com/');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Check Calibration FIL
  console.log('\n2️⃣  Calibration FIL (for Filecoin gas)');
  console.log('-'.repeat(80));
  try {
    const filecoinProvider = new ethers.JsonRpcProvider(process.env.FILECOIN_NETWORK_RPC_URL);
    const filBalance = await filecoinProvider.getBalance(address);
    const fil = ethers.formatEther(filBalance);

    console.log(`   Balance: ${fil} FIL`);
    if (Number(fil) >= 1) {
      console.log('   ✅ Sufficient for testing');
    } else if (Number(fil) > 0) {
      console.log('   ⚠️  Low balance - get more from faucet');
    } else {
      console.log('   ❌ No balance - get Calibration FIL from faucet');
      console.log('   Faucet: https://faucet.calibration.fildev.network/');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Check USDFC (in wallet)
  console.log('\n3️⃣  USDFC Tokens (for Filecoin storage payments)');
  console.log('-'.repeat(80));
  try {
    const filecoinProvider = new ethers.JsonRpcProvider(process.env.FILECOIN_NETWORK_RPC_URL);
    const usdfcContract = new ethers.Contract(USDFC_ADDRESS, ERC20_ABI, filecoinProvider);

    const usdfcBalance = await usdfcContract.balanceOf(address);
    const decimals = await usdfcContract.decimals();
    const symbol = await usdfcContract.symbol();
    const usdfc = ethers.formatUnits(usdfcBalance, decimals);

    console.log(`   Balance: ${usdfc} ${symbol}`);
    console.log(`   Contract: ${USDFC_ADDRESS}`);

    if (Number(usdfc) >= 100) {
      console.log('   ✅ Sufficient for testing');
    } else if (Number(usdfc) > 0) {
      console.log('   ⚠️  Low balance - need at least 100 USDFC');
    } else {
      console.log('   ❌ No USDFC - contact Filecoin community for test tokens');
      console.log('   Community: https://filecoin.io/slack');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Check USDFC in Payments contract
  console.log('\n4️⃣  USDFC in Payments Contract (for active storage)');
  console.log('-'.repeat(80));
  try {
    const synapse = await Synapse.create({
      privateKey: process.env.PRIVATE_KEY,
      rpcURL: process.env.FILECOIN_NETWORK_RPC_URL,
    });

    const paymentsBalance = await synapse.payments.balance('USDFC');
    const paymentsUsdfc = ethers.formatUnits(paymentsBalance, 18);

    console.log(`   Balance: ${paymentsUsdfc} USDFC`);

    if (Number(paymentsUsdfc) >= 10) {
      console.log('   ✅ Sufficient for testing');
    } else if (Number(paymentsUsdfc) > 0) {
      console.log('   ⚠️  Low balance in payments contract');
    } else {
      console.log('   ℹ️  No balance (will deposit when running upload)');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Balance check complete!\n');

  console.log('📝 Next Steps:');
  console.log('   1. Get missing tokens from faucets (see GET_TEST_TOKENS.md)');
  console.log('   2. Once all tokens are available, run:');
  console.log('      node setup-and-upload-real.js');
  console.log('='.repeat(80));
}

checkAllBalances().catch(console.error);
