import { StorageManager } from '../storage/storage-manager.js';
import { logger } from '../utils/logger.js';
import axios from 'axios';
export class AuthManager {
    constructor() {
        Object.defineProperty(this, "storageManager", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "config", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "tokenInfo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "refreshPromise", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        this.storageManager = new StorageManager();
    }
    async initialize() {
        await this.storageManager.initialize();
        this.config = await this.storageManager.getConfig();
        this.tokenInfo = await this.storageManager.getAccessToken();
        logger.info('AuthManager initialized');
    }
    async setConfig(config) {
        const previousConfig = this.config ?? await this.storageManager.getConfig();
        const credentialsChanged = this.hasCredentialsChanged(previousConfig, config);
        this.config = config;
        await this.storageManager.saveConfig(config);
        if (credentialsChanged) {
            this.tokenInfo = null;
            await this.storageManager.clearAccessToken();
        }
        logger.info('Wechat config updated');
    }
    async setCredentialsFromCli(appId, appSecret) {
        const currentConfig = this.config ?? await this.storageManager.getConfig();
        const mergedConfig = {
            appId,
            appSecret,
            token: currentConfig?.token,
            encodingAESKey: currentConfig?.encodingAESKey,
        };
        await this.setConfig(mergedConfig);
    }
    async getConfig() {
        if (!this.config) {
            this.config = await this.storageManager.getConfig();
        }
        return this.config;
    }
    async getAccessToken() {
        const REFRESH_BEFORE_EXPIRY = 5 * 60 * 1000;
        if (this.tokenInfo && this.tokenInfo.expiresAt > Date.now() + REFRESH_BEFORE_EXPIRY) {
            return this.tokenInfo;
        }
        if (this.refreshPromise) {
            return this.refreshPromise;
        }
        this.refreshPromise = this.refreshAccessToken();
        try {
            const tokenInfo = await this.refreshPromise;
            return tokenInfo;
        }
        finally {
            this.refreshPromise = null;
        }
    }
    async refreshAccessToken() {
        if (!this.config) {
            throw new Error('Wechat config not found. Please configure first.');
        }
        try {
            const response = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
                params: {
                    grant_type: 'client_credential',
                    appid: this.config.appId,
                    secret: this.config.appSecret,
                },
                timeout: 10000,
            });
            if (response.data.errcode) {
                throw new Error(`Failed to get access token: ${response.data.errmsg} (${response.data.errcode})`);
            }
            const { access_token, expires_in } = response.data;
            const expiresAt = Date.now() + (expires_in * 1000);
            this.tokenInfo = {
                accessToken: access_token,
                expiresIn: expires_in,
                expiresAt,
            };
            await this.storageManager.saveAccessToken(this.tokenInfo);
            logger.info('Access token refreshed successfully');
            return this.tokenInfo;
        }
        catch (error) {
            logger.error('Failed to refresh access token:', error);
            throw error;
        }
    }
    isConfigured() {
        return !!(this.config?.appId && this.config?.appSecret);
    }
    async clearAuth() {
        this.config = null;
        this.tokenInfo = null;
        await this.storageManager.clearConfig();
        await this.storageManager.clearAccessToken();
        logger.info('Auth cleared');
    }
    hasCredentialsChanged(previousConfig, nextConfig) {
        if (!previousConfig) {
            return true;
        }
        return previousConfig.appId !== nextConfig.appId || previousConfig.appSecret !== nextConfig.appSecret;
    }
}
