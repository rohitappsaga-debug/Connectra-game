import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ games: [] });
});

router.post('/', (req, res) => {
  const { name } = req.body;
  res.json({ id: 'new-game', name, status: 'WAITING' });
});

router.get('/:id', (req, res) => {
  res.json({ id: req.params.id, name: 'Game', status: 'WAITING' });
});

export { router as gameRoutes };
