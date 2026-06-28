import { Router } from 'express';
import { userController } from '../controllers/index.js';
import { validate, registerSchema, loginSchema, updateProfileSchema } from '../validation/index.js';
import { requireUser } from '../middleware/index.js';

const router = Router();

router.post('/register', validate(registerSchema), userController.register);
router.post('/login', validate(loginSchema), userController.login);
router.get('/me', requireUser, userController.getProfile);
router.patch('/me', requireUser, validate(updateProfileSchema), userController.updateProfile);

export { router as userRoutes };
