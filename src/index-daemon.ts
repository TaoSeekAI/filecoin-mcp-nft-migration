#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
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
 * MCP Server Daemon for NFT IPFS to Filecoin Migration
 *
 * Runs as a standalone daemon process, independent of Claude Code Desktop.
 * Uses Streamable HTTP transport (MCP spec 2025-03-26) for client connections.
 */
class NFTMigrationDaemon {
  private server: Server;
  private startTime: number;
  private sessions: Map<string, StreamableHTTPServerTransport> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-nft-migration-daemon',
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

    this.startTime = Date.now();
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
    const app = express();
    app.use(express.json());

    // CORS middleware
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, Last-Event-Id');
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });

    // Request logging
    app.use((req: Request, res: Response, next: NextFunction) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${req.method} ${req.url}`);
      next();
    });

    // MCP endpoint - Streamable HTTP transport
    // Handles both GET (for SSE stream) and POST (for JSON-RPC requests)
    const handleMcpRequest = async (req: Request, res: Response) => {
      console.log(`MCP ${req.method} request`);

      // Create new transport for each request
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: async (sessionId: string) => {
          console.log(`Session initialized: ${sessionId}`);
          this.sessions.set(sessionId, transport);
        },
        onsessionclosed: async (sessionId: string) => {
          console.log(`Session closed: ${sessionId}`);
          this.sessions.delete(sessionId);
        },
        enableDnsRebindingProtection: false,
      });

      // Connect server to transport
      await this.server.connect(transport);

      // Handle the HTTP request
      try {
        await transport.handleRequest(req as any, res as any, req.body);
      } catch (error: any) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: error.message });
        }
      }
    };

    // MCP endpoints (following spec: single endpoint supports GET and POST)
    app.get('/mcp', handleMcpRequest);
    app.post('/mcp', handleMcpRequest);
    app.delete('/mcp', handleMcpRequest);

    // Also support /message for backwards compatibility
    app.get('/message', handleMcpRequest);
    app.post('/message', handleMcpRequest);
    app.delete('/message', handleMcpRequest);

    // OAuth Discovery endpoint - Returns "no auth required" configuration
    // This tells Claude Code that authentication is optional/not required
    app.get('/.well-known/openid-configuration', (req: Request, res: Response) => {
      console.log('OAuth discovery request - returning no-auth-required config');

      // Option 1: Return minimal config suggesting no auth needed
      // Some clients interpret empty grant_types as "no auth required"
      res.json({
        issuer: `http://${HOST}:${PORT}`,
        authorization_endpoint: `http://${HOST}:${PORT}/authorize`,
        token_endpoint: `http://${HOST}:${PORT}/token`,
        registration_endpoint: `http://${HOST}:${PORT}/register`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'client_credentials'],
        code_challenge_methods_supported: ['S256'],
        // Indicate that authentication is optional
        token_endpoint_auth_methods_supported: ['none'],
      });
    });

    // OAuth Registration endpoint - Mock (no-op, returns success)
    // Follows RFC 7591 - OAuth 2.0 Dynamic Client Registration Protocol
    app.post('/register', (req: Request, res: Response) => {
      console.log('OAuth registration request (mock - no auth required)');
      console.log('Request body:', JSON.stringify(req.body, null, 2));

      // Extract redirect_uris from request or use default
      const redirectUris = req.body?.redirect_uris || ['http://localhost'];

      res.json({
        client_id: 'mock-client-id',
        client_secret: 'mock-client-secret',
        client_id_issued_at: Math.floor(Date.now() / 1000),
        client_secret_expires_at: 0, // Never expires
        redirect_uris: redirectUris,
        grant_types: ['authorization_code', 'refresh_token', 'client_credentials'],
        response_types: ['code'],
        // Set to 'none' to indicate no authentication required
        token_endpoint_auth_method: 'none',
        registration_access_token: 'mock-registration-token',
        registration_client_uri: `http://${HOST}:${PORT}/register/mock-client-id`,
      });
    });

    // OAuth Authorization endpoint - Mock (redirect immediately)
    app.get('/authorize', (req: Request, res: Response) => {
      console.log('OAuth authorize request (mock - auto-approve)');
      const redirectUri = (req.query.redirect_uri as string) || 'http://localhost';
      const state = req.query.state || '';
      const code = 'mock-auth-code';
      res.redirect(`${redirectUri}?code=${code}&state=${state}`);
    });

    // OAuth Token endpoint - Mock (return dummy token)
    app.post('/token', (req: Request, res: Response) => {
      console.log('OAuth token request (mock - return dummy token)');
      res.json({
        access_token: 'mock-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
      });
    });

    // Health check endpoint
    app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        timestamp: Date.now(),
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        pid: process.pid,
        activeSessions: this.sessions.size,
      });
    });

    // Info endpoint
    app.get('/info', (req: Request, res: Response) => {
      res.json({
        name: 'mcp-nft-migration-daemon',
        version: '1.0.0',
        mode: 'daemon',
        transport: 'Streamable HTTP',
        protocol: '2025-03-26',
        startTime: this.startTime,
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        activeSessions: this.sessions.size,
        env: {
          walletAddress: process.env.WALLET_ADDRESS || 'Not configured',
          nftNetworkRpc: process.env.NFT_NETWORK_RPC_URL ? 'Configured' : 'Not configured',
          validationNetworkRpc: process.env.VALIDATION_NETWORK_RPC_URL ? 'Configured' : 'Not configured',
          filecoinRpc: process.env.FILECOIN_NETWORK_RPC_URL ? 'Configured' : 'Not configured',
        },
      });
    });

    // Root endpoint
    app.get('/', (req: Request, res: Response) => {
      res.json({
        name: 'MCP NFT Migration Daemon',
        version: '1.0.0',
        transport: 'Streamable HTTP (MCP 2025-03-26)',
        endpoints: {
          health: '/health',
          info: '/info',
          mcp: '/mcp (GET, POST, DELETE)',
          message: '/message (GET, POST, DELETE) - legacy',
        },
        docs: 'https://github.com/TaoSeekAI/agentfilecoin',
      });
    });

    // Error handling
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Express error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: err.message,
      });
    });

    // Start HTTP server
    const PORT = parseInt(process.env.PORT || '3000', 10);
    const HOST = process.env.HOST || 'localhost';

    app.listen(PORT, HOST, () => {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('  MCP NFT Migration Daemon Started');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`  Mode:          Daemon (Streamable HTTP)`);
      console.log(`  Protocol:      MCP 2025-03-26`);
      console.log(`  URL:           http://${HOST}:${PORT}`);
      console.log(`  MCP Endpoint:  http://${HOST}:${PORT}/mcp`);
      console.log(`  Health Check:  http://${HOST}:${PORT}/health`);
      console.log(`  Info:          http://${HOST}:${PORT}/info`);
      console.log(`  PID:           ${process.pid}`);
      console.log(`  Node Version:  ${process.version}`);
      console.log(`  Platform:      ${process.platform}`);
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('  Configure Claude Code with:');
      console.log(`  {`);
      console.log(`    "mcpServers": {`);
      console.log(`      "nft-migration": {`);
      console.log(`        "type": "http",`);
      console.log(`        "url": "http://${HOST}:${PORT}/mcp"`);
      console.log(`      }`);
      console.log(`    }`);
      console.log(`  }`);
      console.log('═══════════════════════════════════════════════════════════════');
    });

    // Graceful shutdown
    const shutdown = (signal: string) => {
      console.log(`\nReceived ${signal}, shutting down gracefully...`);
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// Start the daemon
const daemon = new NFTMigrationDaemon();
daemon.run().catch((error) => {
  console.error('Fatal error in MCP daemon:', error);
  process.exit(1);
});
