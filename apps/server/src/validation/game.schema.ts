import { z } from 'zod';

export const playerMoveSchema = z.object({
  from: z.object({ x: z.number(), y: z.number() }),
  to: z.object({ x: z.number(), y: z.number() }),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const reconnectTokenSchema = z.object({
  token: z.string().min(1),
});

export type PlayerMoveInput = z.infer<typeof playerMoveSchema>;
export type ReconnectTokenInput = z.infer<typeof reconnectTokenSchema>;
