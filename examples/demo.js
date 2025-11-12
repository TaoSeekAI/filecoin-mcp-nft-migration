/**
 * NFT IPFS to Filecoin Migration Demo
 * Complete MVP workflow integrating:
 * - NFT scanning
 * - IPFS to Filecoin migration via Synapse SDK
 * - ERC-8004 Agent Identity & Validation
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { NFTScanner } from './nft-scanner.js';
import { FilecoinUploaderPDP } from './filecoin-uploader-pdp.js';
import { ERC8004OfficialClient } from './erc8004-official-client.js';

// Configuration
const CONFIG = {
  // NFT Network (e.g., Ethereum Mainnet for scanning NFTs)
  nftNetwork: {
    rpcUrl: process.env.NFT_NETWORK_RPC_URL || 'https://eth.llamarpc.com',
    chainId: parseInt(process.env.NFT_NETWORK_CHAIN_ID || '1'),
    name: process.env.NFT_NETWORK_NAME || 'Ethereum Mainnet'
  },

  // Validation Network (e.g., Sepolia for ERC-8004 contracts)
  validationNetwork: {
    rpcUrl: process.env.VALIDATION_NETWORK_RPC_URL || 'https://sepolia.gateway.tenderly.co',
    chainId: parseInt(process.env.VALIDATION_NETWORK_CHAIN_ID || '11155111'),
    name: process.env.VALIDATION_NETWORK_NAME || 'Sepolia Testnet'
  },

  // Filecoin Network (for IPFS to Filecoin storage via Synapse SDK)
  filecoinNetwork: {
    rpcUrl: process.env.FILECOIN_NETWORK_RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1',
    chainId: parseInt(process.env.FILECOIN_NETWORK_CHAIN_ID || '314159'),
    name: process.env.FILECOIN_NETWORK_NAME || 'Filecoin Calibration'
  },

  // Private keys
  privateKey: process.env.PRIVATE_KEY, // Agent owner wallet
  validatorPrivateKey: process.env.VALIDATOR_PRIVATE_KEY, // Validator wallet

  // Contract addresses (on validation network)
  identityContract: process.env.AGENT_IDENTITY_ADDRESS,
  reputationContract: process.env.AGENT_REPUTATION_ADDRESS,
  validationContract: process.env.AGENT_VALIDATION_ADDRESS,

  // NFT configuration (on NFT network)
  nftContract: process.env.NFT_CONTRACT_ADDRESS,
  startTokenId: parseInt(process.env.NFT_START_TOKEN_ID || '1'),
  endTokenId: parseInt(process.env.NFT_END_TOKEN_ID || '10'),

  // IPFS gateway
  ipfsGateway: process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/',

  // Output
  outputDir: './output',
  downloadsDir: './downloads'
};

/**
 * Setup proxy if configured
 */
function setupProxy() {
  if (process.env.HTTP_PROXY) {
    process.env.http_proxy = process.env.HTTP_PROXY;
    process.env.https_proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    console.log('📡 Proxy configured');
  }
}

/**
 * Validate configuration
 */
function validateConfig() {
  console.log('\n🔧 Validating Configuration...');
  console.log('=' .repeat(80));

  const required = [
    'privateKey',
    'identityContract',
    'validationContract',
    'nftContract'
  ];

  const missing = required.filter(key => !CONFIG[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required configuration:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease check your .env file');
    process.exit(1);
  }

  console.log('✅ Configuration valid');
  console.log('\n📡 NFT Network (for scanning):');
  console.log(`   Name: ${CONFIG.nftNetwork.name}`);
  console.log(`   RPC: ${CONFIG.nftNetwork.rpcUrl}`);
  console.log(`   Chain ID: ${CONFIG.nftNetwork.chainId}`);
  console.log(`   NFT Contract: ${CONFIG.nftContract}`);
  console.log(`   Token Range: ${CONFIG.startTokenId} - ${CONFIG.endTokenId}`);

  console.log('\n📡 Validation Network (for ERC-8004):');
  console.log(`   Name: ${CONFIG.validationNetwork.name}`);
  console.log(`   RPC: ${CONFIG.validationNetwork.rpcUrl}`);
  console.log(`   Chain ID: ${CONFIG.validationNetwork.chainId}`);
  console.log(`   Contracts: Identity, Validation`);
}

/**
 * Initialize ethers providers and signers
 */
function initializeEthers() {
  console.log('\n🔐 Initializing Ethers...');

  // NFT Network provider (read-only, for scanning NFTs)
  const nftProvider = new ethers.JsonRpcProvider(CONFIG.nftNetwork.rpcUrl);
  console.log(`✅ NFT Provider: ${CONFIG.nftNetwork.name}`);

  // Validation Network provider and signers
  const validationProvider = new ethers.JsonRpcProvider(CONFIG.validationNetwork.rpcUrl);

  // Agent owner signer (for agent registration and requests)
  const signer = new ethers.Wallet(CONFIG.privateKey, validationProvider);
  console.log(`✅ Validation Provider: ${CONFIG.validationNetwork.name}`);
  console.log(`✅ Agent Wallet: ${signer.address}`);

  // Validator signer (for validation responses)
  let validatorSigner = null;
  if (CONFIG.validatorPrivateKey) {
    validatorSigner = new ethers.Wallet(CONFIG.validatorPrivateKey, validationProvider);
    console.log(`✅ Validator Wallet: ${validatorSigner.address}`);
  }

  return { nftProvider, validationProvider, signer, validatorSigner };
}

/**
 * Save metadata to file and return Filecoin URI
 * NEW: Uploads to Filecoin and returns real CID
 */
async function saveMetadataToFilecoin(metadata, filename, uploader) {
  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // Save local copy for reference
  const filepath = path.join(CONFIG.outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(metadata, null, 2));
  console.log(`   Saved locally: ${filepath}`);

  try {
    // Upload to Filecoin and get real CID
    console.log(`   Uploading ${filename} to Filecoin...`);
    const uploadResult = await uploader.uploadMetadata(metadata, filename.replace('.json', ''));

    console.log(`   ✅ Uploaded to Filecoin: ${uploadResult.uri}`);
    console.log(`   Retrieval URL: ${uploadResult.retrievalUrl}`);

    return uploadResult.uri;  // Returns ipfs://{cid} or f://{cid}
  } catch (error) {
    console.warn(`   ⚠️  Failed to upload to Filecoin: ${error.message}`);
    console.warn(`   Falling back to local file URI`);
    return `file://${path.resolve(filepath)}`;
  }
}

/**
 * Main MVP workflow
 */
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 NFT IPFS to Filecoin Migration MVP');
  console.log('    ERC-8004 Agent Integration Demo');
  console.log('='.repeat(80));

  setupProxy();
  validateConfig();

  const { nftProvider, validationProvider, signer, validatorSigner } = initializeEthers();

  try {
    // Check balance on validation network
    console.log('\n💰 Checking Balance on Validation Network...');
    const balance = await validationProvider.getBalance(signer.address);

    // Determine network name and currency
    const networkInfo = {
      11155111: { name: 'Sepolia', currency: 'ETH', faucet: 'https://sepoliafaucet.com/' },
      314159: { name: 'Calibration', currency: 'FIL', faucet: 'https://faucet.calibration.fildev.network/' },
      84532: { name: 'Base Sepolia', currency: 'ETH', faucet: 'https://docs.base.org/tools/network-faucets' },
      11155420: { name: 'Optimism Sepolia', currency: 'ETH', faucet: 'https://app.optimism.io/faucet' }
    };

    const network = networkInfo[CONFIG.validationNetwork.chainId] || { name: CONFIG.validationNetwork.name, currency: 'ETH', faucet: 'N/A' };

    console.log(`   Network: ${network.name}`);
    console.log(`   Balance: ${ethers.formatEther(balance)} ${network.currency}`);

    if (balance < ethers.parseEther('0.01')) {
      console.warn(`\n⚠️  Warning: Low balance. Get test ${network.currency} from:`);
      console.warn(`   ${network.faucet}`);
    }

    // ========================================================================
    // PHASE 1: Initialize clients
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 1: Initialize Clients');
    console.log('='.repeat(80));

    console.log(`\n📡 NFTScanner: Using ${CONFIG.nftNetwork.name} (Chain ID: ${CONFIG.nftNetwork.chainId})`);
    const nftScanner = new NFTScanner(
      CONFIG.nftContract,
      nftProvider,
      CONFIG.ipfsGateway
    );

    console.log(`📡 FilecoinUploader: Using Real Filecoin PDP (Calibration Testnet)`);
    const filecoinUploader = new FilecoinUploaderPDP();

    console.log(`📡 ERC8004Client: Using ${CONFIG.validationNetwork.name} (Chain ID: ${CONFIG.validationNetwork.chainId})`);
    const erc8004Client = new ERC8004OfficialClient(
      validationProvider,
      signer,
      CONFIG.identityContract,
      CONFIG.validationContract
    );

    // ========================================================================
    // PHASE 2: Register ERC-8004 Agent
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 2: Register ERC-8004 Agent');
    console.log(`Network: ${CONFIG.validationNetwork.name}`);
    console.log('='.repeat(80));

    const agentMetadata = erc8004Client.generateAgentMetadata(
      'NFT Migration Agent',
      'Automated agent for migrating NFT metadata from IPFS to Filecoin',
      [],
      ['nft-scanning', 'ipfs-migration', 'filecoin-storage']
    );

    // Initialize Filecoin uploader first
    await filecoinUploader.initialize();

    const agentMetadataURI = await saveMetadataToFilecoin(agentMetadata, 'agent-metadata.json', filecoinUploader);

    const agentRegistration = await erc8004Client.registerAgent(agentMetadataURI);
    const agentId = agentRegistration.agentId;

    console.log('\n📊 Agent Registration Result:');
    console.log(`   Agent ID: ${agentId}`);
    console.log(`   Owner: ${agentRegistration.owner}`);
    console.log(`   TX: ${agentRegistration.txHash}`);

    // ========================================================================
    // PHASE 3: Scan NFT Project
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 3: Scan NFT Project');
    console.log(`Network: ${CONFIG.nftNetwork.name}`);
    console.log('='.repeat(80));

    const scanResult = await nftScanner.scan(
      CONFIG.startTokenId,
      CONFIG.endTokenId
    );

    const uniqueCIDs = scanResult.uniqueCIDs;

    if (uniqueCIDs.length === 0) {
      console.error('\n❌ No IPFS CIDs found. Cannot proceed.');
      process.exit(1);
    }

    // Save scan results
    const scanReport = {
      contractInfo: scanResult.contractInfo,
      scanTime: new Date().toISOString(),
      tokenRange: {
        start: CONFIG.startTokenId,
        end: CONFIG.endTokenId
      },
      summary: scanResult.scanResults.summary,
      uniqueCIDs,
      tokens: scanResult.scanResults.results
    };

    // Save scan report locally (not uploaded to chain)
    const scanReportPath = path.join(CONFIG.outputDir, 'nft-scan-report.json');
    fs.writeFileSync(scanReportPath, JSON.stringify(scanReport, null, 2));
    console.log(`   Saved: ${scanReportPath}`);

    // ========================================================================
    // PHASE 4: Create ERC-8004 Validation Request
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 4: Create ERC-8004 Validation Request');
    console.log(`Network: ${CONFIG.validationNetwork.name}`);
    console.log('='.repeat(80));

    const taskMetadata = erc8004Client.generateTaskMetadata(
      `Migrate ${uniqueCIDs.length} IPFS CIDs from NFT project to Filecoin`,
      CONFIG.nftContract,
      { start: CONFIG.startTokenId, end: CONFIG.endTokenId },
      uniqueCIDs
    );

    // Upload task metadata to Filecoin
    const taskURI = await saveMetadataToFilecoin(taskMetadata, 'task-metadata.json', filecoinUploader);

    // Use the validator wallet address (separate from agent owner)
    const validatorAddress = validatorSigner.address;

    console.log('\n✅ Using Real Validator Wallet');
    console.log(`   Validator: ${validatorAddress}`);
    console.log(`   Agent Owner: ${signer.address}`);
    console.log('   ERC-8004 requires validator ≠ agent owner\n');

    const validationRequest = await erc8004Client.createValidationRequest(
      agentId,
      taskURI,
      validatorAddress
    );

    const requestHash = validationRequest.requestHash;

    console.log('\n📊 Validation Request Result:');
    console.log(`   Request Hash: ${requestHash}`);
    console.log(`   Agent ID: ${agentId}`);
    console.log(`   TX: ${validationRequest.txHash}`);

    // ========================================================================
    // PHASE 5: Migrate IPFS to Filecoin
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 5: Migrate IPFS to Filecoin');
    console.log('='.repeat(80));

    const migrationResult = await filecoinUploader.batchMigrate(
      uniqueCIDs,
      CONFIG.ipfsGateway,
      2000 // 2 second delay between uploads
    );

    // Save migration results locally
    const migrationReport = filecoinUploader.generateReport();
    const migrationReportPath = path.join(CONFIG.outputDir, 'migration-report.json');
    fs.writeFileSync(migrationReportPath, JSON.stringify(migrationReport, null, 2));
    console.log(`   Saved: ${migrationReportPath}`);

    // ========================================================================
    // PHASE 6: Submit Validation (Proof) to ERC-8004
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 6: Submit Validation (Proof) to ERC-8004');
    console.log(`Network: ${CONFIG.validationNetwork.name}`);
    console.log('='.repeat(80));

    const proofMetadata = erc8004Client.generateProofMetadata(
      taskURI,
      migrationResult.results
    );

    // Upload proof metadata to Filecoin
    const proofURI = await saveMetadataToFilecoin(proofMetadata, 'proof-metadata.json', filecoinUploader);

    console.log('\n📊 Proof Generated:');
    console.log(`   Proof URI: ${proofURI}`);
    console.log(`   Migration Success: ${migrationResult.summary.successful}/${migrationResult.summary.total} CIDs`);

    // Create ERC-8004 client for validator
    console.log('\n🔄 Validator Reviewing Proof...');
    const validatorERC8004Client = new ERC8004OfficialClient(
      validationProvider,
      validatorSigner,
      CONFIG.identityContract,
      CONFIG.validationContract
    );

    // Determine validation result based on migration success
    const isValid = migrationResult.summary.successful > 0;
    const validationResponse = isValid ? 1 : 2; // 1 = Approved, 2 = Rejected

    console.log(`   Validation Decision: ${isValid ? '✅ APPROVED' : '❌ REJECTED'}`);
    console.log(`   Success Rate: ${migrationResult.summary.successRate.toFixed(1)}%`);
    console.log(`   Submitting validation response...`);

    // Submit validation response as validator
    const validationSubmission = await validatorERC8004Client.submitValidationResponse(
      requestHash,
      isValid,
      proofURI
    );

    console.log('\n📊 Validation Response Submitted:');
    console.log(`   Request Hash: ${requestHash}`);
    console.log(`   Response: ${isValid ? 'Approved' : 'Rejected'}`);
    console.log(`   Proof URI: ${proofURI}`);
    console.log(`   TX: ${validationSubmission.txHash}`);

    // ========================================================================
    // PHASE 7: Verify and Generate Final Report
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 7: Verify and Generate Final Report');
    console.log('='.repeat(80));

    // Query final agent state
    const finalAgentState = await erc8004Client.getAgent(agentId);

    console.log('\n📊 Final Agent State:');
    console.log(`   Agent ID: ${agentId}`);
    console.log(`   Owner: ${finalAgentState.owner}`);
    console.log(`   Active: ${finalAgentState.isActive}`);
    console.log(`   Metadata URI: ${finalAgentState.metadataURI}`);

    // Query validation request state (will be "pending" since validator hasn't responded)
    const finalValidationState = await erc8004Client.getValidationRequest(requestHash);

    console.log('\n📊 Validation State:');
    console.log(`   Request Hash: ${requestHash}`);
    console.log(`   Status: ${finalValidationState.status}`);
    console.log(`   Validator: ${validatorAddress}`);
    console.log(`   Requester: ${finalValidationState.requester}`);
    console.log(`   Agent ID: ${finalValidationState.agentId}`);

    // Generate final report
    const finalReport = {
      title: 'NFT IPFS to Filecoin Migration - Complete Report',
      timestamp: new Date().toISOString(),
      networks: {
        nft: {
          name: CONFIG.nftNetwork.name,
          rpcUrl: CONFIG.nftNetwork.rpcUrl,
          chainId: CONFIG.nftNetwork.chainId
        },
        validation: {
          name: CONFIG.validationNetwork.name,
          rpcUrl: CONFIG.validationNetwork.rpcUrl,
          chainId: CONFIG.validationNetwork.chainId
        }
      },
      contracts: {
        identity: CONFIG.identityContract,
        validation: CONFIG.validationContract,
        nft: CONFIG.nftContract
      },
      agent: {
        id: agentId,
        owner: finalAgentState.owner,
        metadataURI: finalAgentState.metadataURI,
        isActive: finalAgentState.isActive,
        registrationTx: agentRegistration.txHash
      },
      validation: {
        requestHash,
        status: finalValidationState.status,
        validator: validatorAddress,
        requester: finalValidationState.requester,
        taskURI: taskURI,
        proofURI: proofURI,
        requestTx: validationRequest.txHash,
        responseTx: validationSubmission.txHash
      },
      nftScan: {
        contract: scanResult.contractInfo,
        tokenRange: { start: CONFIG.startTokenId, end: CONFIG.endTokenId },
        summary: scanResult.scanResults.summary,
        uniqueCIDsFound: uniqueCIDs.length
      },
      migration: {
        totalCIDs: migrationResult.summary.total,
        successful: migrationResult.summary.successful,
        failed: migrationResult.summary.failed,
        successRate: migrationResult.summary.successRate.toFixed(2) + '%',
        results: migrationResult.results
      },
      filesGenerated: [
        'agent-metadata.json',
        'task-metadata.json',
        'proof-metadata.json',
        'nft-scan-report.json',
        'migration-report.json',
        'final-report.json'
      ]
    };

    const finalReportPath = saveMetadata(finalReport, 'final-report.json');

    // ========================================================================
    // SUCCESS SUMMARY
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('🎉 MVP DEMO COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));

    console.log('\n📊 Summary:');
    console.log(`   NFT Network: ${CONFIG.nftNetwork.name} (Chain ID: ${CONFIG.nftNetwork.chainId})`);
    console.log(`   Validation Network: ${CONFIG.validationNetwork.name} (Chain ID: ${CONFIG.validationNetwork.chainId})`);
    console.log(`   ERC-8004 Agent ID: ${agentId}`);
    console.log(`   Validation Request Hash: ${requestHash}`);
    console.log(`   Validation Status: ${finalValidationState.status === 'Approved' ? '✅' : finalValidationState.status === 'Rejected' ? '❌' : '⏳'} ${finalValidationState.status}`);
    console.log(`   NFT Contract: ${CONFIG.nftContract}`);
    console.log(`   Tokens Scanned: ${scanResult.scanResults.summary.total}`);
    console.log(`   Unique IPFS CIDs: ${uniqueCIDs.length}`);
    console.log(`   Migrated to Filecoin: ${migrationResult.summary.successful}/${migrationResult.summary.total}`);
    console.log(`   Success Rate: ${migrationResult.summary.successRate.toFixed(1)}%`);

    console.log('\n📁 Output Files:');
    console.log(`   Reports: ${CONFIG.outputDir}/`);
    console.log(`   Downloads: ${CONFIG.downloadsDir}/`);

    console.log('\n🔗 Transactions:');
    console.log(`   Agent Registration: ${agentRegistration.txHash}`);
    console.log(`   Validation Request: ${validationRequest.txHash}`);
    console.log(`   Validation Response: ${validationSubmission.txHash}`);

    console.log('\n✅ All data saved to: ' + path.resolve(CONFIG.outputDir));

    console.log('\n' + '='.repeat(80));
    console.log('💡 ERC-8004 Value Demonstrated:');
    console.log('   ✅ Decentralized Identity - Agent registered on-chain');
    console.log('   ✅ Work Validation - Task and proof recorded immutably');
    console.log('   ✅ Trust Layer - Verifiable migration results');
    console.log('   ✅ Composability - Other agents can verify this work');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Error during execution:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run the demo
main().catch(console.error);
