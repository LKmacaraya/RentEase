import { Router } from 'express';
import { authRequired, adminOnly } from '../middleware/auth.js';
import { getPublicMessages, postPublicMessage, updatePublicMessage, deletePublicMessage, getPrivateMessages, postPrivateMessage, updatePrivateMessage, deletePrivateMessage, listPrivateThreads, listAdmins } from '../controllers/chat.controller.js';

const router = Router();

router.get('/public', authRequired, getPublicMessages);
router.post('/public', authRequired, postPublicMessage);
router.put('/public/:id', authRequired, updatePublicMessage);
router.delete('/public/:id', authRequired, deletePublicMessage);

router.get('/private/threads', authRequired, listPrivateThreads);
router.get('/private/:listingId/:otherId', authRequired, getPrivateMessages);
router.post('/private/:listingId/:otherId', authRequired, postPrivateMessage);
router.put('/private/:id', authRequired, updatePrivateMessage);
router.delete('/private/:id', authRequired, deletePrivateMessage);

router.get('/admins', authRequired, listAdmins);

export default router;
