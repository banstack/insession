import cors from 'cors';
import { env } from '../config/env.js';

export const corsOptions = {
  origin: env.CORS_ORIGIN,
  credentials: true,
  optionsSuccessStatus: 200,
};

export default cors(corsOptions);
