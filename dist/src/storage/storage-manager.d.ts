import { WechatConfig, AccessTokenInfo, MediaInfo } from '../mcp-tool/types.js';
export declare class StorageManager {
    private db;
    private dbPath;
    private secretKey;
    constructor();
    initialize(): Promise<void>;
    private createTables;
    private createIndexes;
    private encryptValue;
    private decryptValue;
    saveConfig(config: WechatConfig): Promise<void>;
    getConfig(): Promise<WechatConfig | null>;
    clearConfig(): Promise<void>;
    saveAccessToken(tokenInfo: AccessTokenInfo): Promise<void>;
    getAccessToken(): Promise<AccessTokenInfo | null>;
    clearAccessToken(): Promise<void>;
    saveMedia(media: MediaInfo): Promise<void>;
    getMedia(mediaId: string): Promise<MediaInfo | null>;
    listMedia(type?: string): Promise<MediaInfo[]>;
    close(): Promise<void>;
}
