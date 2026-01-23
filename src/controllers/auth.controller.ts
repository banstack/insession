import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../config/database.js';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { user, token } = await authService.register(req.body);

      // Set HTTP-only cookie
      // Use 'none' for cross-origin (different domains), 'strict' for same-origin
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('insession_token', token, {
        httpOnly: true,
        secure: true, // Always true for HTTPS (Railway uses HTTPS)
        sameSite: isProduction ? 'none' : 'strict', // 'none' allows cross-origin cookies
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({ user });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      res.status(400).json({ error: message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { user, token } = await authService.login(req.body);

      // Set HTTP-only cookie
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('insession_token', token, {
        httpOnly: true,
        secure: true,
        sameSite: isProduction ? 'none' : 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({ user });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Login failed';
      res.status(401).json({ error: message });
    }
  }

  async logout(req: Request, res: Response) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('insession_token', {
      httpOnly: true,
      secure: true,
      sameSite: isProduction ? 'none' : 'strict',
    });
    res.status(200).json({ message: 'Logged out successfully' });
  }

  async me(req: AuthRequest, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
        },
      });

      res.status(200).json({ user });
    } catch (error: unknown) {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }
}
