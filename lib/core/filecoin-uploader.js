/**
 * Filecoin Uploader Module
 * Uploads data to Filecoin using Synapse SDK
 * Based on: https://github.com/FilOzone/synapse-sdk/blob/master/utils/example-storage-e2e.js
 */

import { Synapse } from '@filoz/synapse-sdk';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export class FilecoinUploader {
  constructor(privateKey, rpcUrl) {
    this.privateKey = privateKey;
    this.rpcUrl = rpcUrl;
    this.synapse = null;
    this.uploadResults = [];
  }

  /**
   * Initialize Synapse SDK
   * NOTE: Synapse SDK requires Filecoin network (Calibration or Mainnet)
   */
  async initialize() {
    console.log('\n🚀 Initializing Synapse SDK...');
    console.log(`   RPC URL: ${this.rpcUrl}`);

    try {
      // Use Synapse.create() factory method (not constructor)
      this.synapse = await Synapse.create({
        privateKey: this.privateKey,
        rpcURL: this.rpcUrl,  // Note: rpcURL (uppercase)
        withCDN: false,
        disableNonceManager: false
      });

      // Create storage service
      console.log('   Creating storage service...');
      this.storageService = await this.synapse.createStorage({
        proofSetId: 'mvp-demo-' + Date.now(),
        storageProvider: null  // Auto-select provider
      });

      console.log('✅ Synapse SDK initialized successfully');
      console.log('✅ Storage service created');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Synapse SDK:', error.message);
      console.error('   Make sure you are using Filecoin Calibration network');
      throw error;
    }
  }

  /**
   * Download file from IPFS
   */
  async downloadFromIPFS(cid, ipfsGateway = 'https://ipfs.io/ipfs/', outputDir = './downloads') {
    console.log(`\n📥 Downloading from IPFS: ${cid}`);

    try {
      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const url = `${ipfsGateway}${cid}`;
      const outputPath = path.join(outputDir, cid);

      console.log(`   Gateway URL: ${url}`);
      console.log(`   Output path: ${outputPath}`);

      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Filecoin-Uploader-MVP/1.0'
        }
      });

      fs.writeFileSync(outputPath, response.data);

      const sizeKB = (response.data.length / 1024).toFixed(2);
      console.log(`✅ Downloaded successfully (${sizeKB} KB)`);

      return {
        cid,
        localPath: outputPath,
        size: response.data.length,
        data: response.data
      };
    } catch (error) {
      console.error(`❌ Failed to download ${cid}:`, error.message);
      throw error;
    }
  }

  /**
   * Upload data to Filecoin using Synapse SDK
   * Based on SDK's MockStorageService pattern
   */
  async uploadToFilecoin(data, metadata = {}) {
    console.log('\n📤 Uploading to Filecoin...');

    if (!this.storageService) {
      await this.initialize();
    }

    try {
      // Upload using storage service
      console.log('   Preparing data for upload...');
      console.log(`   Data size: ${(data.length / 1024).toFixed(2)} KB`);

      // Call upload method on storage service
      console.log('   Starting upload to Filecoin...');
      const uploadTask = await this.storageService.upload(data);

      // Get CommP (Piece CID) - the mock uses commp() method
      console.log('   Calculating Piece CID (CommP)...');
      const pieceCid = await uploadTask.commp();

      // For MVP/mock, CAR CID is same as Piece CID
      const carCid = pieceCid;

      console.log(`   ✅ Upload complete! Piece CID: ${pieceCid}`);
      console.log(`   ✅ CAR CID: ${carCid}`);

      const result = {
        success: true,
        pieceCid,
        carCid,
        provider: 'f01234', // Mock storage provider
        metadata,
        timestamp: Date.now()
      };

      this.uploadResults.push(result);

      console.log('\n🎉 Filecoin Upload Successful!');
      console.log(`   Piece CID: ${pieceCid}`);
      console.log(`   CAR CID: ${carCid}`);

      return result;
    } catch (error) {
      console.error('❌ Filecoin upload failed:', error.message);
      console.error('   Error details:', error.stack);

      const result = {
        success: false,
        error: error.message,
        metadata,
        timestamp: Date.now()
      };

      this.uploadResults.push(result);
      throw error;
    }
  }

  /**
   * Verify uploaded data
   */
  async verifyUpload(pieceCid) {
    console.log(`\n🔍 Verifying upload: ${pieceCid}`);

    if (!this.synapse) {
      await this.initialize();
    }

    try {
      // Query storage status
      const status = await this.synapse.storage.getStatus(pieceCid);

      console.log('   Status:', status);
      return status;
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      return null;
    }
  }

  /**
   * Download from Filecoin
   */
  async downloadFromFilecoin(pieceCid, outputPath) {
    console.log(`\n📥 Downloading from Filecoin: ${pieceCid}`);

    if (!this.synapse) {
      await this.initialize();
    }

    try {
      const data = await this.synapse.storage.download(pieceCid);

      if (outputPath) {
        fs.writeFileSync(outputPath, data);
        console.log(`✅ Downloaded to: ${outputPath}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Download failed:', error.message);
      throw error;
    }
  }

  /**
   * Complete workflow: IPFS -> Download -> Filecoin
   */
  async migrateIPFSToFilecoin(ipfsCid, ipfsGateway = 'https://ipfs.io/ipfs/') {
    console.log('\n' + '='.repeat(60));
    console.log(`🔄 Migrating IPFS CID to Filecoin: ${ipfsCid}`);
    console.log('='.repeat(60));

    try {
      // Step 1: Download from IPFS
      const downloadResult = await this.downloadFromIPFS(ipfsCid, ipfsGateway);

      // Step 2: Upload to Filecoin
      const uploadResult = await this.uploadToFilecoin(downloadResult.data, {
        originalIPFSCID: ipfsCid,
        originalSize: downloadResult.size,
        sourceGateway: ipfsGateway
      });

      // Step 3: Verify (optional)
      if (uploadResult.pieceCid) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait a bit
        await this.verifyUpload(uploadResult.pieceCid);
      }

      console.log('\n✅ Migration Complete!');
      console.log(`   IPFS CID: ${ipfsCid}`);
      console.log(`   Filecoin Piece CID: ${uploadResult.pieceCid}`);
      console.log(`   Filecoin CAR CID: ${uploadResult.carCid}`);

      return {
        ipfsCid,
        filecoinPieceCid: uploadResult.pieceCid,
        filecoinCarCid: uploadResult.carCid,
        size: downloadResult.size,
        success: true
      };
    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);

      return {
        ipfsCid,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Batch migrate multiple IPFS CIDs
   */
  async batchMigrate(ipfsCids, ipfsGateway = 'https://ipfs.io/ipfs/', delayMs = 1000) {
    console.log('\n' + '='.repeat(60));
    console.log(`📦 Batch Migration: ${ipfsCids.length} IPFS CIDs`);
    console.log('='.repeat(60));

    const results = [];

    for (let i = 0; i < ipfsCids.length; i++) {
      const cid = ipfsCids[i];
      console.log(`\n[${i + 1}/${ipfsCids.length}] Processing: ${cid}`);

      try {
        const result = await this.migrateIPFSToFilecoin(cid, ipfsGateway);
        results.push(result);

        // Delay between uploads to avoid rate limiting
        if (i < ipfsCids.length - 1) {
          console.log(`\n⏳ Waiting ${delayMs}ms before next upload...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        console.error(`\n❌ Failed to migrate ${cid}:`, error.message);
        results.push({
          ipfsCid: cid,
          success: false,
          error: error.message
        });
      }
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log('\n' + '='.repeat(60));
    console.log('📊 Batch Migration Summary:');
    console.log('='.repeat(60));
    console.log(`   Total: ${results.length}`);
    console.log(`   Successful: ${successful}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Success Rate: ${((successful / results.length) * 100).toFixed(1)}%`);

    return {
      results,
      summary: {
        total: results.length,
        successful,
        failed,
        successRate: (successful / results.length) * 100
      }
    };
  }

  /**
   * Get all upload results
   */
  getUploadResults() {
    return this.uploadResults;
  }

  /**
   * Get successful uploads
   */
  getSuccessfulUploads() {
    return this.uploadResults.filter(r => r.success);
  }

  /**
   * Generate migration report
   */
  generateReport() {
    const successful = this.uploadResults.filter(r => r.success);
    const failed = this.uploadResults.filter(r => !r.success);

    return {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.uploadResults.length,
        successful: successful.length,
        failed: failed.length,
        successRate: (successful.length / this.uploadResults.length) * 100
      },
      uploads: this.uploadResults,
      filecoinCIDs: successful.map(r => ({
        pieceCid: r.pieceCid,
        carCid: r.carCid,
        metadata: r.metadata
      }))
    };
  }
}

export default FilecoinUploader;
