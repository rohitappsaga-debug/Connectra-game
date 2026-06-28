import { z } from 'zod';

export const invitePlayerSchema = z.object({
  receiverId: z.string().cuid(),
  message: z.string().max(200).optional(),
});

export const respondInviteSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED']),
});

export const inviteIdParamSchema = z.object({
  inviteId: z.string().cuid(),
});

export type InvitePlayerInput = z.infer<typeof invitePlayerSchema>;
export type RespondInviteInput = z.infer<typeof respondInviteSchema>;
