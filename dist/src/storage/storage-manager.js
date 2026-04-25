import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import CryptoJS from 'crypto-js';
import { logger } from '../utils/logger.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class StorageManager {
    constructor() {
        Object.defineProperty(this, "db", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "dbPath", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "secretKey", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.dbPath = path.join(__dirname, '../../data/wechat-mcp.db');
        this.secretKey = process.env.WECHAT_MCP_SECRET_KEY;
    }
    async initialize() {
        return new Promise((resolve, reject) => {
            const dataDir = path.dirname(this.dbPath);
            if (!existsSync(dataDir)) {
                mkdirSync(dataDir, { recursive: true });
            }
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    logger.error('Failed to open database:', err);
                    reject(err);
                    return;
                }
                this.createTables()
                    .then(() => {
                    logger.info('Storage manager initialized');
                    resolve();
                })
                    .catch(reject);
            });
        });
    }
    async createTables() {
        if (!this.db)
            throw new Error('Database not initialized');
        const run = promisify(this.db.run.bind(this.db));
        await run(`
      CREATE TABLE IF NOT EXISTS config (
        id INTEGER PRIMARY KEY,
        app_id TEXT NOT NULL,
        app_secret TEXT NOT NULL,
        token TEXT,
        encoding_aes_key TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
        await run(`
      CREATE TABLE IF NOT EXISTS access_tokens (
        id INTEGER PRIMARY KEY,
        access_token TEXT NOT NULL,
        expires_in INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
        await run(`
      CREATE TABLE IF NOT EXISTS media (
        media_id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        url TEXT
      )
    `);
        await run(`
      CREATE TABLE IF NOT EXISTS permanent_media (
        media_id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT,
        created_at INTEGER NOT NULL,
        update_time INTEGER,
        url TEXT
      )
    `);
        await run(`
      CREATE TABLE IF NOT EXISTS drafts (
        media_id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        update_time INTEGER NOT NULL
      )
    `);
        await run(`
      CREATE TABLE IF NOT EXISTS publishes (
        publish_id TEXT PRIMARY KEY,
        msg_data_id TEXT NOT NULL,
        idx INTEGER,
        article_url TEXT,
        content TEXT,
        publish_time INTEGER NOT NULL,
        publish_status INTEGER NOT NULL
      )
    `);
        await this.createIndexes();
    }
    async createIndexes() {
        if (!this.db)
            throw new Error('Database not initialized');
        const run = promisify(this.db.run.bind(this.db));
        await run(`CREATE INDEX IF NOT EXISTS idx_access_tokens_expires_at ON access_tokens(expires_at)`)
            .catch(err => logger.warn('Failed to create index on access_tokens.expires_at:', err.message));
        await run(`CREATE INDEX IF NOT EXISTS idx_access_tokens_created_at ON access_tokens(created_at)`)
            .catch(err => logger.warn('Failed to create index on access_tokens.created_at:', err.message));
        await run(`CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at)`)
            .catch(err => logger.warn('Failed to create index on media.created_at:', err.message));
        await run(`CREATE INDEX IF NOT EXISTS idx_permanent_media_created_at ON permanent_media(created_at)`)
            .catch(err => logger.warn('Failed to create index on permanent_media.created_at:', err.message));
        await run(`CREATE INDEX IF NOT EXISTS idx_drafts_update_time ON drafts(update_time)`)
            .catch(err => logger.warn('Failed to create index on drafts.update_time:', err.message));
        await run(`CREATE INDEX IF NOT EXISTS idx_publishes_publish_time ON publishes(publish_time)`)
            .catch(err => logger.warn('Failed to create index on publishes.publish_time:', err.message));
        await run(`CREATE INDEX IF NOT EXISTS idx_publishes_status ON publishes(publish_status)`)
            .catch(err => logger.warn('Failed to create index on publishes.publish_status:', err.message));
        logger.info('Database indexes created successfully');
    }
    encryptValue(value) {
        if (!value)
            return null;
        if (!this.secretKey)
            return value;
        const cipher = CryptoJS.AES.encrypt(value, this.secretKey).toString();
        return `enc:${cipher}`;
    }
    decryptValue(value) {
        if (!value)
            return null;
        if (!this.secretKey)
            return value;
        if (!value.startsWith('enc:'))
            return value;
        const cipher = value.slice(4);
        try {
            const bytes = CryptoJS.AES.decrypt(cipher, this.secretKey);
            const text = bytes.toString(CryptoJS.enc.Utf8);
            return text || null;
        }
        catch {
            return null;
        }
    }
    async saveConfig(config) {
        if (!this.db)
            throw new Error('Database not initialized');
        const run = promisify(this.db.run.bind(this.db));
        const now = Date.now();
        await run(`INSERT OR REPLACE INTO config (id, app_id, app_secret, token, encoding_aes_key, created_at, updated_at) 
       VALUES (1, ?, ?, ?, ?, ?, ?)`, [
            config.appId,
            this.encryptValue(config.appSecret),
            this.encryptValue(config.token || null),
            this.encryptValue(config.encodingAESKey || null),
            now,
            now,
        ]);
    }
    async getConfig() {
        if (!this.db)
            throw new Error('Database not initialized');
        const get = promisify(this.db.get.bind(this.db));
        const row = await get('SELECT * FROM config WHERE id = 1');
        if (!row)
            return null;
        return {
            appId: row.app_id,
            appSecret: this.decryptValue(row.app_secret) || row.app_secret,
            token: this.decryptValue(row.token) || row.token,
            encodingAESKey: this.decryptValue(row.encoding_aes_key) || row.encoding_aes_key,
        };
    }
    async clearConfig() {
        if (!this.db)
            throw new Error('Database not initialized');
        const run = promisify(this.db.run.bind(this.db));
        await run('DELETE FROM config WHERE id = 1');
    }
    async saveAccessToken(tokenInfo) {
        if (!this.db)
            throw new Error('Database not initialized');
        const run = promisify(this.db.run.bind(this.db));
        await run('DELETE FROM access_tokens');
        await run('INSERT INTO access_tokens (access_token, expires_in, expires_at, created_at) VALUES (?, ?, ?, ?)', [this.encryptValue(tokenInfo.accessToken), tokenInfo.expiresIn, tokenInfo.expiresAt, Date.now()]);
    }
    async getAccessToken() {
        if (!this.db)
            throw new Error('Database not initialized');
        const get = promisify(this.db.get.bind(this.db));
        const row = await get('SELECT * FROM access_tokens ORDER BY created_at DESC LIMIT 1');
        if (!row)
            return null;
        return {
            accessToken: this.decryptValue(row.access_token) || row.access_token,
            expiresIn: row.expires_in,
            expiresAt: row.expires_at,
        };
    }
    async clearAccessToken() {
        if (!this.db)
            throw new Error('Database not initialized');
        const run = promisify(this.db.run.bind(this.db));
        await run('DELETE FROM access_tokens');
    }
    async saveMedia(media) {
        if (!this.db)
            throw new Error('Database not initialized');
        const run = promisify(this.db.run.bind(this.db));
        await run('INSERT OR REPLACE INTO media (media_id, type, created_at, url) VALUES (?, ?, ?, ?)', [media.mediaId, media.type, media.createdAt, media.url || null]);
    }
    async getMedia(mediaId) {
        if (!this.db)
            throw new Error('Database not initialized');
        const get = promisify(this.db.get.bind(this.db));
        const row = await get('SELECT * FROM media WHERE media_id = ?', [mediaId]);
        if (!row)
            return null;
        return {
            mediaId: row.media_id,
            type: row.type,
            createdAt: row.created_at,
            url: row.url,
        };
    }
    async listMedia(type) {
        if (!this.db)
            throw new Error('Database not initialized');
        const all = promisify(this.db.all.bind(this.db));
        const query = type
            ? 'SELECT * FROM media WHERE type = ? ORDER BY created_at DESC'
            : 'SELECT * FROM media ORDER BY created_at DESC';
        const params = type ? [type] : [];
        const rows = await all(query, params);
        return rows.map(row => ({
            mediaId: row.media_id,
            type: row.type,
            createdAt: row.created_at,
            url: row.url,
        }));
    }
    async close() {
        if (this.db) {
            return new Promise((resolve, reject) => {
                this.db.close((err) => {
                    if (err) {
                        logger.error('Failed to close database:', err);
                        reject(err);
                    }
                    else {
                        logger.info('Database connection closed');
                        resolve();
                    }
                });
            });
        }
    }
}
