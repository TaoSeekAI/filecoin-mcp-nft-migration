#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { setupTools } from './tools/setup.js';
import { uploadTools } from './tools/upload.js';
import { nftTools } from './tools/nft.js';
import { validationTools } from './tools/validation.js';
import { resourceProviders } from './resources/index.js';
import { promptTemplates } from './prompts/index.js';

/**
 * MCP Server for NFT IPFS to Filecoin Migration
 *
 * Provides tools, resources, and prompts for Claude Code to perform
 * NFT migration tasks through natural language interaction.
 */
class NFTMigrationServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-nft-migration',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List all available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          ...setupTools.getToolDefinitions(),
          ...uploadTools.getToolDefinitions(),
          ...nftTools.getToolDefinitions(),
          ...validationTools.getToolDefinitions(),
        ],
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Route to appropriate tool handler
        if (setupTools.hasHandler(name)) {
          return await setupTools.handleTool(name, args || {});
        }
        if (uploadTools.hasHandler(name)) {
          return await uploadTools.handleTool(name, args || {});
        }
        if (nftTools.hasHandler(name)) {
          return await nftTools.handleTool(name, args || {});
        }
        if (validationTools.hasHandler(name)) {
          return await validationTools.handleTool(name, args || {});
        }

        throw new Error(`Unknown tool: ${name}`);
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error.message}\n\nStack: ${error.stack}`,
            },
          ],
          isError: true,
        };
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: resourceProviders.getResourceList(),
      };
    });

    // Read resource content
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        const content = await resourceProviders.readResource(uri);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(content, null, 2),
            },
          ],
        };
      } catch (error: any) {
        throw new Error(`Failed to read resource ${uri}: ${error.message}`);
      }
    });

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: promptTemplates.getPromptList(),
      };
    });

    // Get prompt template
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const prompt = await promptTemplates.getPrompt(name, args || {});
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: prompt,
              },
            },
          ],
        };
      } catch (error: any) {
        throw new Error(`Failed to get prompt ${name}: ${error.message}`);
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('NFT Migration MCP Server running on stdio');
  }
}

// Start the server
const server = new NFTMigrationServer();
server.run().catch((error) => {
  console.error('Fatal error in MCP server:', error);
  process.exit(1);
});
