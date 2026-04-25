import { WechatApiClient } from '../wechat/api-client.js';
import { logger } from '../utils/logger.js';
import { wechatTools, mcpTools } from './tools/index.js';
export class WechatMcpTool {
    constructor(authManager) {
        Object.defineProperty(this, "apiClient", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "authManager", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "initialized", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "enabledTools", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        this.authManager = authManager;
        this.apiClient = new WechatApiClient(this.authManager);
    }
    initialize(tools) {
        if (this.initialized) {
            return;
        }
        if (tools && tools.length > 0) {
            this.enabledTools = tools;
        }
        else {
            this.enabledTools = mcpTools.map(tool => tool.name);
        }
        this.initialized = true;
        logger.info('WechatMcpTool initialized successfully', { enabledTools: this.enabledTools });
    }
    getTools() {
        if (!this.initialized) {
            this.initialize();
        }
        return mcpTools;
    }
    async callTool(name, args) {
        if (!this.initialized) {
            this.initialize();
        }
        if (!this.enabledTools.includes(name)) {
            throw new Error(`Tool '${name}' is not enabled`);
        }
        const mcpTool = mcpTools.find(t => t.name === name);
        if (mcpTool) {
            try {
                logger.info(`Calling MCP tool: ${name}`, { args, argsType: typeof args, argsKeys: Object.keys(args || {}) });
                const result = await mcpTool.handler(args, this.apiClient);
                logger.info(`MCP Tool '${name}' executed successfully`);
                return result;
            }
            catch (error) {
                logger.error(`MCP Tool '${name}' execution failed:`, error);
                throw error;
            }
        }
        const wechatTool = wechatTools.find(t => t.name === name);
        if (wechatTool) {
            try {
                logger.info(`Calling WeChat tool: ${name}`, { args, argsType: typeof args, argsKeys: Object.keys(args || {}) });
                const result = await wechatTool.handler({
                    args,
                    apiClient: this.apiClient,
                    authManager: this.authManager,
                });
                logger.info(`WeChat Tool '${name}' executed successfully`);
                return result;
            }
            catch (error) {
                logger.error(`WeChat Tool '${name}' execution failed:`, error);
                throw error;
            }
        }
        throw new Error(`Tool '${name}' not found`);
    }
    registerTools(server) {
        if (!this.initialized) {
            this.initialize();
        }
        const tools = this.getTools();
        for (const tool of tools) {
            server.registerTool(tool.name, {
                description: tool.description,
                inputSchema: tool.inputSchema
            }, async (params) => {
                try {
                    logger.debug(`[WechatMcpTool] Calling tool: ${tool.name}`);
                    logger.debug(`[WechatMcpTool] Params type: ${typeof params}`);
                    logger.debug(`[WechatMcpTool] Params keys: ${Object.keys(params || {})}`);
                    const result = await tool.handler(params, this.apiClient);
                    logger.debug(`[WechatMcpTool] Tool ${tool.name} executed successfully`);
                    return result;
                }
                catch (error) {
                    logger.error(`[WechatMcpTool] Error in tool ${tool.name}:`, error);
                    return {
                        content: [{
                                type: 'text',
                                text: `Error: ${error instanceof Error ? error.message : String(error)}`
                            }]
                    };
                }
            });
        }
        this.enabledTools = tools.map(tool => tool.name);
        logger.info(`[WechatMcpTool] Registered ${tools.length} tools to MCP server`);
    }
    getAuthManager() {
        return this.authManager;
    }
    getApiClient() {
        return this.apiClient;
    }
}
