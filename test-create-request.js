import 'dotenv/config';
import { ethers } from 'ethers';
import { ERC8004Client } from './lib/core/erc8004-client.js';

async function main() {
  const provider = new ethers.JsonRpcProvider(
    'https://ethereum-sepolia.publicnode.com',
    undefined,
    { staticNetwork: true }
  );

  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const validatorWallet = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY);

  console.log('Agent Owner:', signer.address);
  console.log('Validator:', validatorWallet.address);

  const client = new ERC8004Client(
    provider,
    signer,
    process.env.AGENT_IDENTITY_ADDRESS,
    process.env.AGENT_VALIDATION_ADDRESS
  );

  const result = await client.createValidationRequest(
    145, // Agent ID
    'ipfs://QmTest' + Date.now(),
    validatorWallet.address // Explicitly pass validator address
  );

  console.log('\nResult:', result);
}

main().catch(console.error);
