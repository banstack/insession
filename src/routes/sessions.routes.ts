import { Router } from 'express';
import { SessionController } from '../controllers/sessions.controller.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticate } from '../middleware/auth.js';
import {
  createSessionSchema,
  updateSessionSchema,
  updateActivitiesSchema,
  addActivitiesSchema,
} from '../utils/validation.js';

const router = Router();
const sessionController = new SessionController();

// All routes require authentication
router.use(authenticate);

router.post('/', validateRequest(createSessionSchema), (req, res) =>
  sessionController.createSession(req, res)
);

router.get('/', (req, res) => sessionController.listSessions(req, res));

router.get('/:id', (req, res) => sessionController.getSession(req, res));

router.patch('/:id', validateRequest(updateSessionSchema), (req, res) =>
  sessionController.updateSession(req, res)
);

router.patch('/:id/activities', validateRequest(updateActivitiesSchema), (req, res) =>
  sessionController.updateActivities(req, res)
);

router.post('/:id/activities', validateRequest(addActivitiesSchema), (req, res) =>
  sessionController.addActivities(req, res)
);

router.delete('/:id', (req, res) => sessionController.deleteSession(req, res));

export default router;
