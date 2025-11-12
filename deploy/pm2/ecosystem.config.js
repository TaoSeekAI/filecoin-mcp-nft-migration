module.exports = {
  apps: [
    {
      name: 'mcp-nft-migration',
      script: './build/index-daemon.js',
      cwd: '/var/tmp/vibe-kanban/worktrees/0d79-aiagent/mcp-nft-migration',

      // Node.js interpreter
      interpreter: 'node',
      interpreter_args: '--max-old-space-size=1024',

      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: 'localhost',
        PRIVATE_KEY: '0xe4db9f0c28faad37e59e900592a45d2556e3d76137f7a45f83e5740ab35b7e9f',
        WALLET_ADDRESS: '0xB34d4c8E3AcCB5FA62455228281649Be525D4e59',
        ETHEREUM_NETWORK_RPC_URL: 'https://eth-sepolia.public.blastapi.io',
        FILECOIN_NETWORK_RPC_URL: 'https://api.calibration.node.glif.io/rpc/v1',
        ETHEREUM_MAINNET_RPC_URL: 'https://eth-mainnet.public.blastapi.io',
        AGENT_IDENTITY_ADDRESS: '0x7177a6867296406881E20d6647232314736Dd09A',
        AGENT_VALIDATION_ADDRESS: '0x662b40A526cb4017d947e71eAF6753BF3eeE66d8',
        NFT_CONTRACT_ADDRESS: '0xED5AF388653567Af2F388E6224dC7C4b3241C544',
        VALIDATOR_PRIVATE_KEY: '0xade117fff61d9728ead68bfe8f8a619dbd85b2c9908b0760816dbc0c4f1a45dd',
      },

      // Development environment (optional)
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        HOST: 'localhost',
      },

      // Production environment (optional)
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: 'localhost',
      },

      // Restart policy
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Advanced features
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,

      // Cron restart (optional, restart daily at 3am)
      // cron_restart: '0 3 * * *',

      // Environment-specific settings
      env_file: '../mvp-demo/.env',
    },
  ],

  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'taoseekai',
      host: 'localhost',
      ref: 'origin/feature/nft-ipfs-migration',
      repo: 'https://github.com/TaoSeekAI/agentfilecoin',
      path: '/var/tmp/vibe-kanban/worktrees/0d79-aiagent',
      'post-deploy': 'cd mcp-nft-migration && npm install && npm run build && pm2 reload ecosystem.config.js --env production',
    },
  },
};
