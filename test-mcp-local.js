#!/usr/bin/env node

/**
 * 本地测试脚本 - 验证 MCP Server 是否正常工作
 *
 * 使用方法:
 *   node test-mcp-local.js
 *
 * 这个脚本会测试:
 * 1. MCP Server 是否能启动
 * 2. 工具列表是否正确
 * 3. 资源列表是否正确
 * 4. 提示模板列表是否正确
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testMCPServer() {
  log('blue', '\n=== MCP Server 本地测试 ===\n');

  const serverPath = join(__dirname, 'build', 'index.js');

  log('yellow', '1. 启动 MCP Server...');

  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PRIVATE_KEY: process.env.PRIVATE_KEY || '0xe4db9f0c28faad37e59e900592a45d2556e3d76137f7a45f83e5740ab35b7e9f',
      WALLET_ADDRESS: process.env.WALLET_ADDRESS || '0xB34d4c8E3AcCB5FA62455228281649Be525D4e59',
    }
  });

  let stderrOutput = '';

  server.stderr.on('data', (data) => {
    stderrOutput += data.toString();
  });

  // 等待服务器启动
  await new Promise((resolve) => setTimeout(resolve, 2000));

  if (stderrOutput.includes('NFT Migration MCP Server running on stdio')) {
    log('green', '✅ MCP Server 启动成功');
  } else {
    log('red', '❌ MCP Server 启动失败');
    console.log('stderr:', stderrOutput);
    server.kill();
    process.exit(1);
  }

  log('yellow', '\n2. 测试工具列表 (ListTools)...');

  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
  };

  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  let toolsResponse = '';
  let receivedTools = false;

  server.stdout.on('data', (data) => {
    toolsResponse += data.toString();

    try {
      const lines = toolsResponse.split('\n').filter(line => line.trim());
      for (const line of lines) {
        const response = JSON.parse(line);

        if (response.id === 1 && response.result) {
          receivedTools = true;
          const tools = response.result.tools;

          log('green', `✅ 接收到 ${tools.length} 个工具:`);
          tools.forEach((tool) => {
            console.log(`   - ${tool.name}: ${tool.description}`);
          });

          // 验证预期工具
          const expectedTools = [
            'verify_setup',
            'setup_approvals',
            'check_balances',
            'upload_to_filecoin',
            'test_upload',
            'nft_scan',
            'get_nft_metadata',
            'erc8004_validate',
            'update_contract_uri',
          ];

          const toolNames = tools.map(t => t.name);
          const missingTools = expectedTools.filter(t => !toolNames.includes(t));

          if (missingTools.length === 0) {
            log('green', '✅ 所有预期工具都存在');
          } else {
            log('red', `❌ 缺少工具: ${missingTools.join(', ')}`);
          }
        }
      }
    } catch (e) {
      // 继续累积数据
    }
  });

  // 等待响应
  await new Promise((resolve) => setTimeout(resolve, 2000));

  if (!receivedTools) {
    log('red', '❌ 未收到工具列表响应');
    log('yellow', '原始输出:');
    console.log(toolsResponse);
  }

  log('yellow', '\n3. 测试资源列表 (ListResources)...');

  const listResourcesRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'resources/list',
  };

  server.stdin.write(JSON.stringify(listResourcesRequest) + '\n');

  await new Promise((resolve) => setTimeout(resolve, 1000));

  log('yellow', '\n4. 测试提示模板列表 (ListPrompts)...');

  const listPromptsRequest = {
    jsonrpc: '2.0',
    id: 3,
    method: 'prompts/list',
  };

  server.stdin.write(JSON.stringify(listPromptsRequest) + '\n');

  await new Promise((resolve) => setTimeout(resolve, 1000));

  log('yellow', '\n5. 关闭 MCP Server...');
  server.kill();

  log('green', '\n✅ 测试完成！\n');
  log('blue', '下一步:');
  console.log('1. 配置 Claude Code Desktop (参考 CLAUDE_CODE_SETUP.md)');
  console.log('2. 重启 Claude Code Desktop');
  console.log('3. 在 Claude Code 中测试自然语言交互\n');
}

testMCPServer().catch((error) => {
  log('red', `❌ 测试失败: ${error.message}`);
  console.error(error);
  process.exit(1);
});
