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
      res.status(200).json(label);
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
}
