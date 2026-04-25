import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WechatApiClient } from '../wechat/api-client.js';
import { AuthManager } from '../auth/auth-manager.js';
import { WechatToolResult, WechatToolArgs, McpTool } from './types.js';
export declare class WechatMcpTool {
    private apiClient;
    private authManager;
    private initialized;
    private enabledTools;
    constructor(authManager: AuthManager);
    initialize(tools?: string[]): void;
    getTools(): McpTool[];
    callTool(name: string, args: WechatToolArgs): Promise<WechatToolResult>;
    registerTools(server: McpServer): void;
    getAuthManager(): AuthManager;
    getApiClient(): WechatApiClient;
}
