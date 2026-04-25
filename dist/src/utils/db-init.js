#!/usr/bin/env tsx
import { StorageManager } from '../storage/storage-manager.js';
import { logger } from './logger.js';
async function initDatabase() {
    try {
        logger.info('Initializing database...');
        const storageManager = new StorageManager();
        await storageManager.initialize();
        logger.info('Database initialized successfully!');
        await storageManager.close();
        process.exit(0);
    }
    catch (error) {
        logger.error('Failed to initialize database:', error);
        process.exit(1);
    }
}
if (import.meta.url === `file://${process.argv[1]}`) {
    initDatabase();
}
export { initDatabase };
