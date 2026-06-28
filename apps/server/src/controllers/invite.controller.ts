import type { Request, Response } from 'express';
import { inviteService } from '../services/invite.service.js';
import type { InvitePlayerInput, RespondInviteInput } from '../validation/invite.schema.js';

export const inviteController = {
  async send(req: Request, res: Response) {
    const userId = req.headers['x-user-id'] as string;
    const roomId = req.params.id as string;
    const input = req.body as InvitePlayerInput;
    const invite = await inviteService.sendInvite(userId, roomId, input);
    res.status(201).json({ data: invite });
  },

  async respond(req: Request, res: Response) {
    const userId = req.headers['x-user-id'] as string;
    const inviteId = req.params.inviteId as string;
    const input = req.body as RespondInviteInput;
    const invite = await inviteService.respondInvite(userId, inviteId, input.status);
    res.json({ data: invite });
  },

  async getPending(req: Request, res: Response) {
    const userId = req.headers['x-user-id'] as string;
    const invites = await inviteService.getPendingInvites(userId);
    res.json({ data: invites });
  },

  async getRoomInvites(req: Request, res: Response) {
    const roomId = req.params.id as string;
    const invites = await inviteService.getRoomInvites(roomId);
    res.json({ data: invites });
  },
};
