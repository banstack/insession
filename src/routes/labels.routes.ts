import { Router } from 'express';
import { LabelController } from '../controllers/labels.controller.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticate } from '../middleware/auth.js';
import { upsertLabelSchema } from '../utils/validation.js';

const router = Router();
const labelController = new LabelController();

// All routes require authentication
router.use(authenticate);

router.get('/', (req, res) => labelController.getLabels(req, res));

router.put('/', validateRequest(upsertLabelSchema), (req, res) =>
  labelController.upsertLabel(req, res)
);

router.delete('/:color', (req, res) => labelController.deleteLabel(req, res));

// Get count of unlinked activities for a color
router.get('/:color/unlinked-count', (req, res) =>
  labelController.getUnlinkedCount(req, res)
);

// Backfill: link historical activities to a label by color
router.post('/:color/backfill', (req, res) =>
  labelController.backfillActivities(req, res)
);

export default router;
