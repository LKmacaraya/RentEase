import { Router } from 'express';
import { register, login, me } from '../controllers/auth.controller.js';
import { authRequired, adminOnly } from '../middleware/auth.js';

const router = Router();

router.post('/register', register); // { name, email, password, role? }
router.post('/login', login); // { email, password }
router.get('/me', authRequired, me);
router.get('/admin/ping', authRequired, adminOnly, (req, res) => res.json({ ok: true }));

export default router;
