import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRouter from './routes/health.routes.js';
import authRouter from './routes/auth.routes.js';
import listingsRouter from './routes/listings.routes.js';
import chatRouter from './routes/chat.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/chat', chatRouter);

app.use(errorHandler);

export default app;
