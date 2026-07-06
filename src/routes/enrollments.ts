import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ message: 'enrollments route' });
});

export default router;
