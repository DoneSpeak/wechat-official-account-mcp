import { WechatApiClient } from '../wechat/api-client.js';
import { AuthManager } from '../auth/auth-manager.js';
import { ZodRawShape } from 'zod';
export { WechatApiClient };
export interface WechatToolArgs {
    [key: string]: unknown;
}
export interface WechatToolResult {
    [x: string]: unknown;
    content: Array<{
        type: 'text' | 'image' | 'resource';
        text?: string;
        data?: string;
        uri?: string;
        mimeType?: string;
    }>;
    isError?: boolean;
}
export interface WechatToolContext {
    args: WechatToolArgs;
    apiClient: WechatApiClient;
    authManager: AuthManager;
}
export type WechatToolHandler = (context: WechatToolContext) => Promise<WechatToolResult>;
export interface WechatToolDefinition {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, unknown>;
        required?: string[];
    };
    handler: WechatToolHandler;
}
export type McpToolHandler = (params: unknown, apiClient: WechatApiClient) => Promise<WechatToolResult>;
export interface McpTool {
    name: string;
    description: string;
    inputSchema: ZodRawShape;
    handler: McpToolHandler;
}
export interface WechatConfig {
    appId: string;
    appSecret: string;
    token?: string;
    encodingAESKey?: string;
}
export interface AccessTokenInfo {
    accessToken: string;
    expiresIn: number;
    expiresAt: number;
}
export interface MediaInfo {
    mediaId: string;
    type: 'image' | 'voice' | 'video' | 'thumb';
    createdAt: number;
    url?: string;
}
export interface PermanentMediaInfo extends MediaInfo {
    name?: string;
    updateTime?: number;
}
export interface DraftInfo {
    mediaId: string;
    content: {
        newsItem: Array<{
            title: string;
            author?: string;
            digest?: string;
            content: string;
            contentSourceUrl?: string;
            thumbMediaId: string;
            showCoverPic?: number;
            needOpenComment?: number;
            onlyFansCanComment?: number;
        }>;
    };
    updateTime: number;
}
export interface PublishInfo {
    publishId: string;
    msgDataId: string;
    idx?: number;
    articleUrl?: string;
    content?: {
        title: string;
        author?: string;
        digest?: string;
        content: string;
        contentSourceUrl?: string;
        thumbUrl?: string;
    };
    publishTime: number;
    publishStatus: number;
}
