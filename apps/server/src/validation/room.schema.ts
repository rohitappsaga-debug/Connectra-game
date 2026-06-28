import { z } from 'zod';

export const createRoomSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  maxPlayers: z.number().int().min(2).max(4).default(2),
});

export const joinRoomSchema = z.object({
  code: z.string().min(1).max(10),
});

export const roomIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const roomCodeParamSchema = z.object({
  code: z.string().min(1).max(10),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const userIdHeaderSchema = z.object({
  'x-user-id': z.string().cuid(),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
