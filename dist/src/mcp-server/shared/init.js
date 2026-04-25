import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WechatMcpTool } from '../../mcp-tool/index.js';
import { AuthManager } from '../../auth/auth-manager.js';
import { initStdioServer, initSSEServer } from '../transport/index.js';
import { logger } from '../../utils/logger.js';
import { readFileSync } from 'fs';
export async function initWechatMcpServer(options) {
    const { appId, appSecret, tools } = options;
    if (!appId || !appSecret) {
        logger.error('Error: Missing App Credentials');
        throw new Error('Missing App Credentials');
    }
    const getVersion = () => {
        const candidates = [
            '../../../../package.json',
            '../../../package.json',
            '../../package.json',
        ];
        for (const candidate of candidates) {
            try {
                const packageJson = JSON.parse(readFileSync(new URL(candidate, import.meta.url), 'utf-8'));
                return packageJson.version || '1.0.0';
            }
            catch {
                continue;
            }
        }
        return '1.0.0';
    };
    const mcpServer = new McpServer({
        name: 'WeChat Official Account MCP Server',
        version: getVersion()
    });
    const authManager = new AuthManager();
    await authManager.initialize();
    await authManager.setCredentialsFromCli(appId, appSecret);
    const wechatTool = new WechatMcpTool(authManager);
    await wechatTool.initialize(tools);
    wechatTool.registerTools(mcpServer);
    return { mcpServer, wechatTool, authManager };
}
export async function initMcpServerWithTransport(options) {
    const { mode = 'stdio' } = options;
    const getNewServer = async (commonOptions) => {
        const { mcpServer } = await initWechatMcpServer({ ...options, ...commonOptions });
        return mcpServer;
    };
    switch (mode) {
        case 'stdio':
            await initStdioServer(getNewServer, options);
            break;
        case 'sse':
            await initSSEServer(getNewServer, options);
            break;
        default:
            throw new Error('Invalid mode: ' + mode);
    }
}
