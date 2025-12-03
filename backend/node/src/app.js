import express from 'express';
import dotenv from 'dotenv';
import healthRouter from './routes/health.routes.js';
import authRouter from './routes/auth.routes.js';
import listingsRouter from './routes/listings.routes.js';
import chatRouter from './routes/chat.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
app.use(express.json({ limit: '5mb' }));

// Serve static frontend from ../frontend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../../../frontend');
app.use(express.static(publicDir));

// Root route -> index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'landing.html'));
});

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/chat', chatRouter);

app.use(errorHandler);

export default app;
