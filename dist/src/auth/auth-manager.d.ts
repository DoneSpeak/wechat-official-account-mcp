import { WechatConfig, AccessTokenInfo } from '../mcp-tool/types.js';
export declare class AuthManager {
    private storageManager;
    private config;
    private tokenInfo;
    private refreshPromise;
    constructor();
    initialize(): Promise<void>;
    setConfig(config: WechatConfig): Promise<void>;
    setCredentialsFromCli(appId: string, appSecret: string): Promise<void>;
    getConfig(): Promise<WechatConfig | null>;
    getAccessToken(): Promise<AccessTokenInfo>;
    refreshAccessToken(): Promise<AccessTokenInfo>;
    isConfigured(): boolean;
    clearAuth(): Promise<void>;
    private hasCredentialsChanged;
}
