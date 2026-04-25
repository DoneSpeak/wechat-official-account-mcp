import { z } from 'zod';
import { logger } from '../../utils/logger.js';
import { appIdSchema, appSecretSchema } from '../../utils/validation.js';
const authToolSchema = z.object({
    action: z.enum(['configure', 'get_token', 'refresh_token', 'get_config']),
    appId: appIdSchema.optional(),
    appSecret: appSecretSchema.optional(),
    token: z.string().max(128, 'Token长度不能超过128个字符').optional(),
    encodingAESKey: z.string().length(43, 'EncodingAESKey必须为43个字符').optional(),
    reveal: z.boolean().optional(),
});
function shouldRevealSecrets(reveal) {
    return reveal === true && process.env.WECHAT_MCP_REVEAL_SECRETS === 'true';
}
function maskSecret(value) {
    if (!value)
        return '未设置';
    if (value.length <= 8)
        return '***';
    return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
}
async function handleAuthTool(context) {
    const { args, authManager } = context;
    try {
        const validatedArgs = authToolSchema.parse(args);
        const { action, appId, appSecret, token, encodingAESKey, reveal } = validatedArgs;
        const revealSecrets = shouldRevealSecrets(reveal);
        switch (action) {
            case 'configure': {
                if (!appId || !appSecret) {
                    throw new Error('appId and appSecret are required for configuration');
                }
                await authManager.setConfig({
                    appId,
                    appSecret,
                    token,
                    encodingAESKey,
                });
                return {
                    content: [{
                            type: 'text',
                            text: `微信公众号配置已成功保存\n- AppID: ${appId}\n- Token: ${token ? '已设置' : '未设置'}\n- EncodingAESKey: ${encodingAESKey ? '已设置' : '未设置'}`,
                        }],
                };
            }
            case 'get_token': {
                const tokenInfo = await authManager.getAccessToken();
                const expiresIn = Math.max(0, Math.floor((tokenInfo.expiresAt - Date.now()) / 1000));
                return {
                    content: [{
                            type: 'text',
                            text: `Access Token 信息:\n- Token: ${revealSecrets ? tokenInfo.accessToken : maskSecret(tokenInfo.accessToken)}\n- 剩余有效时间: ${expiresIn} 秒\n- 过期时间: ${new Date(tokenInfo.expiresAt).toLocaleString()}`,
                        }],
                };
            }
            case 'refresh_token': {
                const tokenInfo = await authManager.refreshAccessToken();
                const expiresIn = Math.max(0, Math.floor((tokenInfo.expiresAt - Date.now()) / 1000));
                return {
                    content: [{
                            type: 'text',
                            text: `Access Token 已刷新:\n- 新 Token: ${revealSecrets ? tokenInfo.accessToken : maskSecret(tokenInfo.accessToken)}\n- 有效时间: ${expiresIn} 秒\n- 过期时间: ${new Date(tokenInfo.expiresAt).toLocaleString()}`,
                        }],
                };
            }
            case 'get_config': {
                const config = await authManager.getConfig();
                if (!config) {
                    return {
                        content: [{
                                type: 'text',
                                text: '尚未配置微信公众号信息，请先使用 configure 操作进行配置。',
                            }],
                    };
                }
                return {
                    content: [{
                            type: 'text',
                            text: `当前微信公众号配置:\n- AppID: ${config.appId}\n- AppSecret: ${revealSecrets ? config.appSecret : maskSecret(config.appSecret)}\n- Token: ${revealSecrets ? (config.token || '未设置') : maskSecret(config.token)}\n- EncodingAESKey: ${revealSecrets ? (config.encodingAESKey || '未设置') : maskSecret(config.encodingAESKey)}`,
                        }],
                };
            }
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }
    catch (error) {
        logger.error('Auth tool error:', error);
        return {
            content: [{
                    type: 'text',
                    text: `认证操作失败: ${error instanceof Error ? error.message : '未知错误'}`,
                }],
            isError: true,
        };
    }
}
async function handleAuthMcpTool(args, apiClient) {
    try {
        const validatedArgs = authToolSchema.parse(args);
        const { action, appId, appSecret, token, encodingAESKey, reveal } = validatedArgs;
        const revealSecrets = shouldRevealSecrets(reveal);
        const authManager = apiClient.getAuthManager();
        switch (action) {
            case 'configure': {
                if (!appId || !appSecret) {
                    throw new Error('appId and appSecret are required for configuration');
                }
                await authManager.setConfig({ appId, appSecret, token, encodingAESKey });
                return {
                    content: [{
                            type: 'text',
                            text: `微信公众号配置已成功保存\n- AppID: ${appId}\n- Token: ${token ? '已设置' : '未设置'}\n- EncodingAESKey: ${encodingAESKey ? '已设置' : '未设置'}`,
                        }],
                };
            }
            case 'get_token': {
                const tokenInfo = await authManager.getAccessToken();
                const expiresIn = Math.max(0, Math.floor((tokenInfo.expiresAt - Date.now()) / 1000));
                return {
                    content: [{
                            type: 'text',
                            text: `Access Token 信息:\n- Token: ${revealSecrets ? tokenInfo.accessToken : maskSecret(tokenInfo.accessToken)}\n- 剩余有效时间: ${expiresIn} 秒\n- 过期时间: ${new Date(tokenInfo.expiresAt).toLocaleString()}`,
                        }],
                };
            }
            case 'refresh_token': {
                const tokenInfo = await authManager.refreshAccessToken();
                const expiresIn = Math.max(0, Math.floor((tokenInfo.expiresAt - Date.now()) / 1000));
                return {
                    content: [{
                            type: 'text',
                            text: `Access Token 已刷新:\n- 新 Token: ${revealSecrets ? tokenInfo.accessToken : maskSecret(tokenInfo.accessToken)}\n- 有效时间: ${expiresIn} 秒\n- 过期时间: ${new Date(tokenInfo.expiresAt).toLocaleString()}`,
                        }],
                };
            }
            case 'get_config': {
                const config = await authManager.getConfig();
                if (!config) {
                    return {
                        content: [{
                                type: 'text',
                                text: '尚未配置微信公众号信息，请先使用 configure 操作进行配置。',
                            }],
                    };
                }
                return {
                    content: [{
                            type: 'text',
                            text: `当前微信公众号配置:\n- AppID: ${config.appId}\n- AppSecret: ${revealSecrets ? config.appSecret : maskSecret(config.appSecret)}\n- Token: ${revealSecrets ? (config.token || '未设置') : maskSecret(config.token)}\n- EncodingAESKey: ${revealSecrets ? (config.encodingAESKey || '未设置') : maskSecret(config.encodingAESKey)}`,
                        }],
                };
            }
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }
    catch (error) {
        logger.error('Auth MCP tool error:', error);
        return {
            content: [{
                    type: 'text',
                    text: `认证操作失败: ${error instanceof Error ? error.message : '未知错误'}`,
                }],
            isError: true,
        };
    }
}
export const authTool = {
    name: 'wechat_auth',
    description: '管理微信公众号认证配置和 Access Token',
    inputSchema: {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['configure', 'get_token', 'refresh_token', 'get_config'],
                description: '操作类型：configure(配置), get_token(获取令牌), refresh_token(刷新令牌), get_config(获取配置)',
            },
            appId: {
                type: 'string',
                description: '微信公众号 AppID（配置时必需）',
            },
            appSecret: {
                type: 'string',
                description: '微信公众号 AppSecret（配置时必需）',
            },
            token: {
                type: 'string',
                description: '微信公众号 Token（可选，用于消息验证）',
            },
            encodingAESKey: {
                type: 'string',
                description: '微信公众号 EncodingAESKey（可选，用于消息加密）',
            },
            reveal: {
                type: 'boolean',
                description: '是否显示完整敏感信息（仅当 WECHAT_MCP_REVEAL_SECRETS=true 时生效）',
            },
        },
        required: ['action'],
    },
    handler: handleAuthTool,
};
export const authMcpTool = {
    name: 'wechat_auth',
    description: '管理微信公众号认证配置和 Access Token',
    inputSchema: {
        action: z.enum(['configure', 'get_token', 'refresh_token', 'get_config']).describe('操作类型：configure(配置), get_token(获取令牌), refresh_token(刷新令牌), get_config(获取配置)'),
        appId: z.string().optional().describe('微信公众号 AppID（配置时必需）'),
        appSecret: z.string().optional().describe('微信公众号 AppSecret（配置时必需）'),
        token: z.string().optional().describe('微信公众号 Token（可选，用于消息验证）'),
        encodingAESKey: z.string().optional().describe('微信公众号 EncodingAESKey（可选，用于消息加密）'),
        reveal: z.boolean().optional().describe('是否显示完整敏感信息（仅当 WECHAT_MCP_REVEAL_SECRETS=true 时生效）'),
    },
    handler: handleAuthMcpTool,
};
