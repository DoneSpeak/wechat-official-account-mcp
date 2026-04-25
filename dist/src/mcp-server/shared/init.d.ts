import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WechatMcpTool } from '../../mcp-tool/index.js';
import { AuthManager } from '../../auth/auth-manager.js';
import { McpServerOptions } from './types';
export declare function initWechatMcpServer(options: McpServerOptions): Promise<{
    mcpServer: McpServer;
    wechatTool: WechatMcpTool;
    authManager: AuthManager;
}>;
export declare function initMcpServerWithTransport(options: McpServerOptions): Promise<void>;
