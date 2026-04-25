import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
dotenv.config();
const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/auth', authRoutes);
app.use('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'ok',
    });
});
app.use((error, req, res, _next) => {
    void _next;
    res.status(500).json({
        success: false,
        error: 'Server internal error',
    });
});
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'API not found',
    });
});
export default app;
