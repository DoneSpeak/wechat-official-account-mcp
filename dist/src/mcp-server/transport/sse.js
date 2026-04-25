import express from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { logger } from '../../utils/logger.js';
export const initSSEServer = async (getNewServer, options) => {
    const { appId, appSecret, port = '3000' } = options;
    const allowedOrigin = process.env.CORS_ORIGIN;
    const sseToken = process.env.WECHAT_MCP_SSE_TOKEN || process.env.MCP_AUTH_TOKEN;
    if (!appId || !appSecret) {
        logger.error('Missing App ID or App Secret');
        process.exit(1);
    }
    const app = express();
    app.use(express.json());
    if (!sseToken) {
        logger.warn('SSE auth token is not configured. SSE endpoint is running without authentication.');
    }
    app.use(['/sse', '/messages'], (req, res, next) => {
        if (!sseToken) {
            next();
            return;
        }
        const authHeader = req.headers.authorization;
        const bearerToken = authHeader?.startsWith('Bearer ')
            ? authHeader.substring('Bearer '.length)
            : undefined;
        const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;
        const requestToken = bearerToken || queryToken;
        if (requestToken !== sseToken) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        next();
    });
    app.use((err, req, res, _next) => {
        void _next;
        logger.error('SSE server error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    app.get('/sse', async (req, res) => {
        try {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                ...(allowedOrigin ? { 'Access-Control-Allow-Origin': allowedOrigin } : {}),
                'Access-Control-Allow-Headers': 'Cache-Control'
            });
            const transport = new SSEServerTransport("/messages", res);
            const mcpServer = await getNewServer(options);
            await mcpServer.connect(transport);
            req.on('close', async () => {
                try {
                    logger.info('SSE connection closed, cleaning up...');
                }
                catch (error) {
                    logger.error('Error during SSE cleanup:', error);
                }
            });
            req.on('error', (error) => {
                logger.error('SSE request error:', error);
            });
        }
        catch (error) {
            logger.error('Error in SSE handler:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to establish SSE connection' });
            }
        }
    });
    const server = app.listen(port, () => {
        logger.info(`SSE server listening on port ${port}`);
    });
    server.on('error', (error) => {
        logger.error('HTTP server error:', error);
    });
    logger.info(`[SSEServerTransport] Connecting to WeChat MCP Server, appId: ${appId.substring(0, 8)}...`);
    const shutdown = async (signal) => {
        logger.info(`[SSEServerTransport] Received ${signal}, shutting down gracefully...`);
        try {
            server.close(() => {
                logger.info('HTTP server closed');
                process.exit(0);
            });
            setTimeout(() => {
                logger.warn('Forcing shutdown after timeout');
                process.exit(1);
            }, 5000);
        }
        catch (error) {
            logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught exception:', error);
        shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled rejection at:', promise, 'reason:', reason);
        shutdown('unhandledRejection');
    });
};
