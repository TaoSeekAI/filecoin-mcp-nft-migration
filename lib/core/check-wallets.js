import 'dotenv/config';
import { ethers } from 'ethers';

async function main() {
  console.log('\n🔑 Checking Wallet Addresses...\n');

  try {
    const wallet1 = new ethers.Wallet(process.env.PRIVATE_KEY);
    const wallet2 = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY);

    console.log('PRIVATE_KEY address:          ', wallet1.address);
    console.log('VALIDATOR_PRIVATE_KEY address:', wallet2.address);
    console.log('\nAre different:', wallet1.address !== wallet2.address ? '✅ Yes - Perfect!' : '❌ No - PROBLEM!');

    if (wallet1.address === wallet2.address) {
      console.log('\n⚠️  ERROR: Both wallets have the same address!');
      console.log('This will trigger self-validation prevention.');
      process.exit(1);
    }

    console.log('\n📋 Addresses for reference:');
    console.log('ADDRESSES_START');
    console.log(JSON.stringify({
      ownerAddress: wallet1.address,
      validatorAddress: wallet2.address
    }, null, 2));
    console.log('ADDRESSES_END');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
