import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { LabelService } from '../services/labels.service.js';

const labelService = new LabelService();

export class LabelController {
  async getLabels(req: AuthRequest, res: Response) {
    try {
      const labels = await labelService.getLabels(req.user!.userId);
      res.status(200).json({ labels });
    } catch (error: unknown) {
      res.status(500).json({ error: 'Failed to fetch labels' });
    }
  }

  async upsertLabel(req: AuthRequest, res: Response) {
    try {
      const { color, name } = req.body;
      const label = await labelService.upsertLabel(req.user!.userId, color, name);

      // Count unlinked activities with this color to offer backfill
      const unlinkedCount = await labelService.countUnlinkedActivitiesByColor(
        req.user!.userId,
        color
      );

      res.status(200).json({ ...label, unlinkedCount });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save label';
      res.status(400).json({ error: message });
    }
  }

  async deleteLabel(req: AuthRequest, res: Response) {
    try {
      const color = decodeURIComponent(req.params.color as string);
      await labelService.deleteLabel(req.user!.userId, color);
      res.status(204).send();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Label not found';
      res.status(404).json({ error: message });
    }
  }

  async getUnlinkedCount(req: AuthRequest, res: Response) {
    try {
      const color = decodeURIComponent(req.params.color as string);
      const count = await labelService.countUnlinkedActivitiesByColor(
        req.user!.userId,
        color
      );
      res.status(200).json({ count });
    } catch (error: unknown) {
      res.status(500).json({ error: 'Failed to count activities' });
    }
  }

  async backfillActivities(req: AuthRequest, res: Response) {
    try {
      const color = decodeURIComponent(req.params.color as string);
      const updatedCount = await labelService.backfillActivitiesByColor(
        req.user!.userId,
        color
      );
      res.status(200).json({ updatedCount });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to backfill activities';
      res.status(400).json({ error: message });
    }
  }
}
