import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticate } from '../middleware/auth.js';
import { registerSchema, loginSchema } from '../utils/validation.js';

const router = Router();
const authController = new AuthController();

router.post('/register', validateRequest(registerSchema), (req, res) =>
  authController.register(req, res)
);

router.post('/login', validateRequest(loginSchema), (req, res) =>
  authController.login(req, res)
);

router.post('/logout', (req, res) => authController.logout(req, res));

router.get('/me', authenticate, (req, res) => authController.me(req, res));

export default router;
