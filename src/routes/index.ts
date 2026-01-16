import { Router } from 'express';
import authRoutes from './auth.routes.js';
import sessionRoutes from './sessions.routes.js';

const router = Router();

router.use('/v1/auth', authRoutes);
router.use('/v1/sessions', sessionRoutes);

export default router;
