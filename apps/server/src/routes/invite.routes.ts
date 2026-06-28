import { Router } from 'express';
import { inviteController } from '../controllers/index.js';
import { validate, respondInviteSchema } from '../validation/index.js';
import { requireUser } from '../middleware/index.js';

const router = Router();

router.get('/pending', requireUser, inviteController.getPending);
router.post('/:inviteId/respond', requireUser, validate(respondInviteSchema), inviteController.respond);

export { router as inviteRoutes };
