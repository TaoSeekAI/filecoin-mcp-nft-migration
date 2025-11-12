/**
 * ERC-8004 Client Module
 * Interacts with ERC-8004 Agent Identity and Validation contracts
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

// Our Simplified ERC-8004 Contract ABIs
const AGENT_IDENTITY_ABI = [
  // Simplified ERC-8004 Registration (FREE registration)
  'function register(string calldata metadataURI) external payable returns (uint256 agentId)',
  'function getAgent(uint256 agentId) external view returns (address owner, string metadataURI, uint256 registeredAt, bool isActive)',
  'function registrationFee() external view returns (uint256)',

  // ERC-721 Standard Functions
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function balanceOf(address owner) external view returns (uint256)',

  // Events
  'event AgentRegistered(uint256 indexed agentId, address indexed owner, string metadataURI, uint256 timestamp)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
];

const AGENT_VALIDATION_ABI = [
  // ✅ Updated from real contract on Sepolia Etherscan (2025-11-12)
  // Contract: 0x662b40A526cb4017d947e71eAF6753BF3eeE66d8
  'function validationRequest(address validatorAddress, uint256 agentId, string calldata requestUri, bytes32 requestHash) external',
  'function validationResponse(bytes32 requestHash, uint8 response, string calldata responseUri, bytes32 responseHash, bytes32 tag) external',
  'function getValidationStatus(bytes32 requestHash) external view returns (address validatorAddress, uint256 agentId, uint8 response, bytes32 tag, uint256 lastUpdate)',
  'event ValidationRequest(address indexed validatorAddress, uint256 indexed agentId, string requestUri, bytes32 indexed requestHash)',
  'event ValidationResponse(address indexed validatorAddress, uint256 indexed agentId, bytes32 indexed requestHash, uint8 response, string responseUri, bytes32 responseHash, bytes32 tag)'
];

export class ERC8004Client {
  constructor(provider, signer, identityAddress, validationAddress) {
    this.provider = provider;
    this.signer = signer;
    this.identityAddress = identityAddress;
    this.validationAddress = validationAddress;

    // Initialize contracts
    this.identityContract = new ethers.Contract(
      identityAddress,
      AGENT_IDENTITY_ABI,
      signer
    );

    this.validationContract = new ethers.Contract(
      validationAddress,
      AGENT_VALIDATION_ABI,
      signer
    );

    this.registeredAgents = [];
    this.validationRequests = [];
  }

  /**
   * Register an agent with our simplified ERC-8004 contract
   */
  async registerAgent(metadataURI) {
    console.log('\n📝 Registering Agent with ERC-8004...');
    console.log('=' .repeat(60));
    console.log(`   Metadata URI: ${metadataURI}`);

    try {
      // Check balance for gas
      const balance = await this.provider.getBalance(this.signer.address);
      console.log(`   Current Balance: ${ethers.formatEther(balance)} ETH`);

      // Try to get registration fee, but skip if not available
      let fee = 0n;
      try {
        fee = await this.identityContract.registrationFee();
        console.log(`   Registration Fee: ${ethers.formatEther(fee)} ETH`);
      } catch (e) {
        console.log('   Registration Fee: FREE (function not available)');
      }

      // Register
      console.log('\n   Sending registration transaction...');
      const tx = await this.identityContract.register(metadataURI, { value: fee });

      console.log(`   Transaction hash: ${tx.hash}`);
      console.log('   Waiting for confirmation...');

      const receipt = await tx.wait();

      // Parse AgentRegistered event to get agent ID
      const agentRegisteredEvent = receipt.logs
        .map(log => {
          try {
            return this.identityContract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e && e.name === 'AgentRegistered');

      const agentId = agentRegisteredEvent ? Number(agentRegisteredEvent.args.agentId) : null;

      console.log('\n✅ Agent Registered Successfully!');
      console.log(`   Agent ID (Token ID): ${agentId}`);
      console.log(`   Transaction: ${tx.hash}`);
      console.log(`   Block: ${receipt.blockNumber}`);

      const result = {
        agentId,
        metadataURI,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        owner: this.signer.address,
        timestamp: Date.now()
      };

      this.registeredAgents.push(result);

      return result;
    } catch (error) {
      console.error('❌ Agent registration failed:', error.message);
      throw error;
    }
  }

  /**
   * Get agent information (using ERC-721 functions)
   */
  async getAgent(agentId) {
    console.log(`\n🔍 Querying Agent #${agentId}...`);

    try {
      // Use ERC-721 standard functions
      const owner = await this.identityContract.ownerOf(agentId);
      const metadataURI = await this.identityContract.tokenURI(agentId);

      const result = {
        agentId,
        owner,
        metadataURI,
        isActive: true // If ownerOf doesn't revert, the token exists
      };

      console.log('\n📋 Agent Information:');
      console.log(`   Token ID: ${result.agentId}`);
      console.log(`   Owner: ${result.owner}`);
      console.log(`   Metadata URI: ${result.metadataURI}`);
      console.log(`   Active: ${result.isActive}`);

      return result;
    } catch (error) {
      console.error(`❌ Failed to get agent #${agentId}:`, error.message);
      throw error;
    }
  }

  /**
   * Create validation request
   * IMPORTANT: validator must be different from agent owner (Self-validation not allowed)
   */
  async createValidationRequest(agentId, taskURI, validator = null) {
    console.log('\n📋 Creating Validation Request...');
    console.log('=' .repeat(60));
    console.log(`   Agent ID: ${agentId}`);
    console.log(`   Task URI: ${taskURI}`);

    // Get agent owner to ensure validator is different
    const agentOwner = await this.identityContract.ownerOf(agentId);
    console.log(`   Agent Owner: ${agentOwner}`);

    // Validator must be different from agent owner (Self-validation not allowed)
    // Use a well-known address or specify one
    let validatorAddress = validator;
    if (!validatorAddress || validatorAddress.toLowerCase() === agentOwner.toLowerCase()) {
      // Use Vitalik's address as default validator (common practice in testnet)
      validatorAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
      console.log(`   ⚠️  Using default validator (Self-validation not allowed)`);
    }
    console.log(`   Validator: ${validatorAddress}`);

    try {
      console.log('\n   Sending transaction...');
      // Use correct function name and parameter order: validator, agentId, requestUri, requestHash
      // requestHash = 0x0 means let contract generate it
      const tx = await this.validationContract.validationRequest(
        validatorAddress,
        agentId,
        taskURI,
        ethers.ZeroHash
      );

      console.log(`   Transaction hash: ${tx.hash}`);
      console.log('   Waiting for confirmation...');

      const receipt = await tx.wait();

      // Parse events to get request hash
      const event = receipt.logs
        .map(log => {
          try {
            return this.validationContract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e && e.name === 'ValidationRequest');

      const requestHash = event ? event.args.requestHash : null;

      console.log('\n✅ Validation Request Created!');
      console.log(`   Request Hash: ${requestHash}`);
      console.log(`   Transaction: ${tx.hash}`);
      console.log(`   Block: ${receipt.blockNumber}`);

      const result = {
        requestHash,
        agentId,
        taskURI,
        validator: validatorAddress,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        timestamp: Date.now()
      };

      this.validationRequests.push(result);

      return result;
    } catch (error) {
      console.error('❌ Failed to create validation request:', error.message);
      throw error;
    }
  }

  /**
   * Submit validation (as validator)
   */
  async submitValidation(requestHash, isValid, proofURI) {
    console.log('\n📤 Submitting Validation...');
    console.log('=' .repeat(60));
    console.log(`   Request Hash: ${requestHash}`);
    console.log(`   Is Valid: ${isValid}`);
    console.log(`   Proof URI: ${proofURI}`);

    try {
      // Convert isValid (boolean) to response (uint8: 0-100)
      // True = 100 (fully valid), False = 0 (invalid)
      const response = isValid ? 100 : 0;

      // Calculate response hash from proof URI
      const responseHash = ethers.keccak256(ethers.toUtf8Bytes(proofURI));

      // Use zero hash as tag for now
      const tag = ethers.ZeroHash;

      console.log(`   Response Score: ${response}/100`);
      console.log(`   Response Hash: ${responseHash.substring(0, 10)}...`);

      console.log('\n   Sending transaction...');
      const tx = await this.validationContract.validationResponse(
        requestHash,
        response,
        proofURI,
        responseHash,
        tag
      );

      console.log(`   Transaction hash: ${tx.hash}`);
      console.log('   Waiting for confirmation...');

      const receipt = await tx.wait();

      console.log('\n✅ Validation Submitted!');
      console.log(`   Transaction: ${tx.hash}`);
      console.log(`   Block: ${receipt.blockNumber}`);

      return {
        requestHash,
        response,
        isValid,
        responseUri: proofURI,
        responseHash,
        tag,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('❌ Failed to submit validation:', error.message);
      throw error;
    }
  }

  /**
   * Get validation request details
   */
  async getValidationRequest(requestHash) {
    console.log(`\n🔍 Querying Validation Request ${requestHash.substring(0, 10)}...`);

    try {
      const request = await this.validationContract.getValidationRequest(requestHash);

      const statusNames = ['Pending', 'Completed', 'Expired'];

      const result = {
        requestHash,
        agentId: Number(request[0]),
        requester: request[1],
        validator: request[2],
        workURI: request[3],
        status: statusNames[Number(request[4])] || 'Unknown',
        statusCode: Number(request[4]),
        isValid: request[5],
        proofURI: request[6],
        requestedAt: Number(request[7]),
        completedAt: Number(request[8])
      };

      console.log('\n📋 Validation Request:');
      console.log(`   Request Hash: ${result.requestHash}`);
      console.log(`   Agent ID: ${result.agentId}`);
      console.log(`   Requester: ${result.requester}`);
      console.log(`   Validator: ${result.validator}`);
      console.log(`   Work URI: ${result.workURI}`);
      console.log(`   Proof URI: ${result.proofURI || 'Not submitted'}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Is Valid: ${result.isValid}`);
      console.log(`   Requested: ${new Date(result.requestedAt * 1000).toISOString()}`);

      return result;
    } catch (error) {
      console.error(`❌ Failed to get validation request:`, error.message);
      throw error;
    }
  }

  /**
   * Generate metadata JSON for agent
   */
  generateAgentMetadata(name, description, endpoints, capabilities) {
    return {
      name,
      description,
      image: '', // Can be added later
      endpoints: endpoints || [],
      capabilities: capabilities || [],
      supportedTrust: ['validation'],
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate task metadata JSON
   */
  generateTaskMetadata(description, nftContract, tokenRange, ipfsCids) {
    return {
      task: 'NFT IPFS to Filecoin Migration',
      description,
      nftContract,
      tokenRange,
      ipfsCids: ipfsCids || [],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate proof metadata JSON
   */
  generateProofMetadata(taskURI, migrationResults) {
    const successful = migrationResults.filter(r => r.success);
    const failed = migrationResults.filter(r => !r.success);

    return {
      taskURI,
      proof: {
        type: 'FilecoinMigration',
        migrationResults: migrationResults.map(r => ({
          ipfsCid: r.ipfsCid,
          filecoinPieceCid: r.filecoinPieceCid,
          filecoinCarCid: r.filecoinCarCid,
          success: r.success,
          error: r.error || null
        })),
        summary: {
          total: migrationResults.length,
          successful: successful.length,
          failed: failed.length,
          successRate: (successful.length / migrationResults.length) * 100
        }
      },
      verificationMethod: 'On-chain storage proof via Synapse SDK',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get all registered agents
   */
  getRegisteredAgents() {
    return this.registeredAgents;
  }

  /**
   * Get all validation requests
   */
  getValidationRequests() {
    return this.validationRequests;
  }
}

export default ERC8004Client;
