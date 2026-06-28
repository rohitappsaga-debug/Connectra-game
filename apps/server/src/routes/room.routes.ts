import { Router } from 'express';
import { roomController, inviteController } from '../controllers/index.js';
import { validate, createRoomSchema, paginationSchema } from '../validation/index.js';
import { requireUser } from '../middleware/index.js';

const router = Router();

router.get('/', validate(paginationSchema, 'query'), roomController.list);
router.post('/', requireUser, validate(createRoomSchema), roomController.create);
router.get('/code/:code', roomController.getByCode);
router.get('/:id', roomController.getById);
router.post('/:code/join', requireUser, roomController.join);
router.post('/:id/leave', requireUser, roomController.leave);
router.delete('/:id', requireUser, roomController.delete);
router.post('/:id/ready', requireUser, roomController.setReady);

router.post('/:id/invites', requireUser, inviteController.send);
router.get('/:id/invites', requireUser, inviteController.getRoomInvites);

export { router as roomRoutes };
