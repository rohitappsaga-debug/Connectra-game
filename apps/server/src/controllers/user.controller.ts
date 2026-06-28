import type { Request, Response } from 'express';
import { userService } from '../services/user.service.js';
import type { RegisterInput, LoginInput, UpdateProfileInput } from '../validation/user.schema.js';

export const userController = {
  async register(req: Request, res: Response) {
    const input = req.body as RegisterInput;
    const user = await userService.register(input);
    res.status(201).json({ data: user });
  },

  async login(req: Request, res: Response) {
    const input = req.body as LoginInput;
    const user = await userService.login(input);
    res.json({ data: user });
  },

  async getProfile(req: Request, res: Response) {
    const userId = req.headers['x-user-id'] as string;
    const user = await userService.getProfile(userId);
    res.json({ data: user });
  },

  async updateProfile(req: Request, res: Response) {
    const userId = req.headers['x-user-id'] as string;
    const input = req.body as UpdateProfileInput;
    const user = await userService.updateProfile(userId, input);
    res.json({ data: user });
  },
};
