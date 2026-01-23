import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { SessionService } from '../services/sessions.service.js';

const sessionService = new SessionService();

export class SessionController {
  async createSession(req: AuthRequest, res: Response) {
    try {
      const session = await sessionService.createSession({
        userId: req.user!.userId,
        activities: req.body.activities,
      });

      res.status(201).json(session);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create session';
      res.status(400).json({ error: message });
    }
  }

  async getSession(req: AuthRequest, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const session = await sessionService.getSession(sessionId, req.user!.userId);
      res.status(200).json(session);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Session not found';
      res.status(404).json({ error: message });
    }
  }

  async listSessions(req: AuthRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await sessionService.listSessions(req.user!.userId, page, limit);
      res.status(200).json(result);
    } catch (error: unknown) {
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  }

  async updateSession(req: AuthRequest, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const session = await sessionService.updateSession(
        sessionId,
        req.user!.userId,
        req.body
      );
      res.status(200).json(session);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update session';
      res.status(400).json({ error: message });
    }
  }

  async updateActivities(req: AuthRequest, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const session = await sessionService.updateActivities(
        sessionId,
        req.user!.userId,
        req.body
      );
      res.status(200).json(session);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update activities';
      res.status(400).json({ error: message });
    }
  }

  async deleteSession(req: AuthRequest, res: Response) {
    try {
      const sessionId = req.params.id as string;
      await sessionService.deleteSession(sessionId, req.user!.userId);
      res.status(204).send();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Session not found';
      res.status(404).json({ error: message });
    }
  }

  async addActivities(req: AuthRequest, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const session = await sessionService.addActivities(
        sessionId,
        req.user!.userId,
        req.body
      );
      res.status(200).json(session);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to add activities';
      res.status(400).json({ error: message });
    }
  }

  async deleteActivity(req: AuthRequest, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const activityId = req.params.activityId as string;
      const session = await sessionService.deleteActivity(
        sessionId,
        req.user!.userId,
        activityId
      );
      res.status(200).json(session);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete activity';
      res.status(400).json({ error: message });
    }
  }
}
