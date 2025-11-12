/**
 * NFT Scanner Module
 * Scans ERC-721/ERC-1155 NFT contracts and extracts IPFS CIDs from metadata
 */

import { ethers } from 'ethers';
import axios from 'axios';

// ERC-721 ABI (minimal interface)
const ERC721_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function supportsInterface(bytes4 interfaceId) view returns (bool)'
];

// Interface IDs
const INTERFACE_ID_ERC721 = '0x80ac58cd';
const INTERFACE_ID_ERC1155 = '0xd9b67a26';

export class NFTScanner {
  constructor(contractAddress, provider, ipfsGateway = 'https://ipfs.io/ipfs/') {
    this.contractAddress = contractAddress;
    this.provider = provider;
    this.ipfsGateway = ipfsGateway;
    this.contract = new ethers.Contract(contractAddress, ERC721_ABI, provider);
  }

  /**
   * Detect NFT contract type
   */
  async detectContractType() {
    try {
      const isERC721 = await this.contract.supportsInterface(INTERFACE_ID_ERC721);
      if (isERC721) {
        return 'ERC721';
      }

      const isERC1155 = await this.contract.supportsInterface(INTERFACE_ID_ERC1155);
      if (isERC1155) {
        return 'ERC1155';
      }

      return 'UNKNOWN';
    } catch (error) {
      console.error('Error detecting contract type:', error.message);
      return 'ERC721'; // Default to ERC721
    }
  }

  /**
   * Get basic contract info
   */
  async getContractInfo() {
    try {
      const name = await this.contract.name();
      const symbol = await this.contract.symbol();
      const type = await this.detectContractType();

      let totalSupply = 0;
      try {
        totalSupply = await this.contract.totalSupply();
        totalSupply = Number(totalSupply);
      } catch (error) {
        console.log('Note: totalSupply() not available, will scan by token IDs');
      }

      return {
        address: this.contractAddress,
        name,
        symbol,
        type,
        totalSupply
      };
    } catch (error) {
      console.error('Error getting contract info:', error.message);
      throw error;
    }
  }

  /**
   * Extract IPFS CID from various URI formats
   */
  extractIPFSCID(uri) {
    if (!uri) return null;

    // Format: ipfs://QmXXX... or ipfs://ipfs/QmXXX...
    if (uri.startsWith('ipfs://')) {
      const cid = uri.replace('ipfs://', '').replace('ipfs/', '');
      return cid.split('/')[0]; // Get base CID without path
    }

    // Format: https://ipfs.io/ipfs/QmXXX...
    if (uri.includes('ipfs.io/ipfs/')) {
      const match = uri.match(/ipfs\.io\/ipfs\/([^\/\?]+)/);
      return match ? match[1] : null;
    }

    // Format: https://gateway.pinata.cloud/ipfs/QmXXX...
    if (uri.includes('/ipfs/')) {
      const match = uri.match(/\/ipfs\/([^\/\?]+)/);
      return match ? match[1] : null;
    }

    // Format: QmXXX... (raw CID)
    if (uri.startsWith('Qm') || uri.startsWith('bafy')) {
      return uri.split('/')[0];
    }

    return null;
  }

  /**
   * Fetch and parse metadata from URI
   */
  async fetchMetadata(tokenURI) {
    try {
      let url = tokenURI;

      // Convert IPFS URI to HTTP gateway
      if (tokenURI.startsWith('ipfs://')) {
        const cid = tokenURI.replace('ipfs://', '').replace('ipfs/', '');
        url = `${this.ipfsGateway}${cid}`;
      }

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'NFT-Scanner-MVP/1.0'
        }
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching metadata from ${tokenURI}:`, error.message);
      return null;
    }
  }

  /**
   * Scan a single token
   */
  async scanToken(tokenId) {
    try {
      // Get token URI
      const tokenURI = await this.contract.tokenURI(tokenId);

      // Get owner
      let owner = null;
      try {
        owner = await this.contract.ownerOf(tokenId);
      } catch (error) {
        console.log(`Token ${tokenId} might not exist or is burned`);
        return null;
      }

      // Extract metadata CID
      const metadataCID = this.extractIPFSCID(tokenURI);

      // Fetch metadata
      const metadata = await this.fetchMetadata(tokenURI);

      // Extract image CID from metadata
      let imageCID = null;
      if (metadata && metadata.image) {
        imageCID = this.extractIPFSCID(metadata.image);
      }

      return {
        tokenId,
        owner,
        tokenURI,
        metadataCID,
        metadata,
        imageCID,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error scanning token ${tokenId}:`, error.message);
      return null;
    }
  }

  /**
   * Scan multiple tokens
   */
  async scanTokens(startTokenId, endTokenId) {
    console.log(`\n📡 Scanning NFT tokens ${startTokenId} to ${endTokenId}...`);

    const results = [];
    const errors = [];

    for (let tokenId = startTokenId; tokenId <= endTokenId; tokenId++) {
      console.log(`\n  Scanning token #${tokenId}...`);

      const tokenData = await this.scanToken(tokenId);

      if (tokenData) {
        console.log(`  ✅ Token #${tokenId}:`);
        console.log(`     Owner: ${tokenData.owner}`);
        console.log(`     Metadata CID: ${tokenData.metadataCID || 'N/A'}`);
        console.log(`     Image CID: ${tokenData.imageCID || 'N/A'}`);

        results.push(tokenData);
      } else {
        console.log(`  ❌ Token #${tokenId}: Failed to scan`);
        errors.push(tokenId);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return {
      results,
      errors,
      summary: {
        total: endTokenId - startTokenId + 1,
        success: results.length,
        failed: errors.length
      }
    };
  }

  /**
   * Get unique IPFS CIDs from scan results
   */
  getUniqueIPFSCIDs(scanResults) {
    const cids = new Set();

    scanResults.results.forEach(token => {
      if (token.metadataCID) {
        cids.add(token.metadataCID);
      }
      if (token.imageCID) {
        cids.add(token.imageCID);
      }
    });

    return Array.from(cids);
  }

  /**
   * Full scan workflow
   */
  async scan(startTokenId = 1, endTokenId = 10) {
    console.log('\n🔍 Starting NFT Scan...');
    console.log('=' .repeat(60));

    // Get contract info
    const contractInfo = await this.getContractInfo();
    console.log('\n📝 Contract Information:');
    console.log(`   Name: ${contractInfo.name}`);
    console.log(`   Symbol: ${contractInfo.symbol}`);
    console.log(`   Type: ${contractInfo.type}`);
    console.log(`   Address: ${contractInfo.address}`);
    if (contractInfo.totalSupply > 0) {
      console.log(`   Total Supply: ${contractInfo.totalSupply}`);
    }

    // Scan tokens
    const scanResults = await this.scanTokens(startTokenId, endTokenId);

    // Get unique CIDs
    const uniqueCIDs = this.getUniqueIPFSCIDs(scanResults);

    console.log('\n📊 Scan Summary:');
    console.log('=' .repeat(60));
    console.log(`   Total Tokens Scanned: ${scanResults.summary.total}`);
    console.log(`   Successful: ${scanResults.summary.success}`);
    console.log(`   Failed: ${scanResults.summary.failed}`);
    console.log(`   Unique IPFS CIDs Found: ${uniqueCIDs.length}`);

    if (uniqueCIDs.length > 0) {
      console.log('\n📦 Unique IPFS CIDs:');
      uniqueCIDs.forEach((cid, index) => {
        console.log(`   ${index + 1}. ${cid}`);
      });
    }

    return {
      contractInfo,
      scanResults,
      uniqueCIDs
    };
  }
}

export default NFTScanner;
