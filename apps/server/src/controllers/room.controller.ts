import type { Request, Response } from 'express';
import { roomService } from '../services/room.service.js';
import type { CreateRoomInput } from '../validation/room.schema.js';
import { pagedResult, parsePagination } from '../utils/pagination.js';

export const roomController = {
  async create(req: Request, res: Response) {
    const userId = req.headers['x-user-id'] as string;
    const input = req.body as CreateRoomInput;
    const room = await roomService.create(userId, input);
    res.status(201).json({ data: room });
  },

  async join(req: Request, res: Response) {
    const userId = req.headers['x-user-id'] as string;
    const code = req.params.code as string;
    const result = await roomService.join(userId, code);
    res.json({ data: result });
  },

  async leave(req: Request, res: Response) {
    const userId = req.headers['x-user-id'] as string;
    const id = req.params.id as string;
    const result = await roomService.leave(userId, id);
    res.json({ data: result });
  },

  async delete(req: Request, res: Response) {
    const userId = req.headers['x-user-id'] as string;
    const id = req.params.id as string;
    await roomService.delete(userId, id);
    res.status(204).send();
  },

  async getById(req: Request, res: Response) {
    const id = req.params.id as string;
    const room = await roomService.getRoom(id);
    res.json({ data: room });
  },

  async getByCode(req: Request, res: Response) {
    const code = req.params.code as string;
    const room = await roomService.getRoomByCode(code);
    res.json({ data: room });
  },

  async list(req: Request, res: Response) {
    const { page, pageSize } = parsePagination(req.query as Record<string, string>);
    const result = await roomService.listRooms(page, pageSize);
    res.json({ data: pagedResult(result.rooms, result.total, page, pageSize) });
  },

  async setReady(req: Request, res: Response) {
    const userId = req.headers['x-user-id'] as string;
    const id = req.params.id as string;
    const { isReady } = req.body as { isReady: boolean };
    const players = await roomService.setReady(userId, id, isReady);
    res.json({ data: players });
  },
};
