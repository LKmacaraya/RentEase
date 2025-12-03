import dotenv from 'dotenv';
import app from './app.js';
import { init } from './startup/init.js';

dotenv.config();

const PORT = process.env.PORT || 4000;

init()
  .catch((err) => {
    console.error('[startup] init failed:', err);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`[server] RentEase API listening on port ${PORT}`);
    });
  });
