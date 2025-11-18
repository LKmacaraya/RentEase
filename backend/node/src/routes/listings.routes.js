import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import {
  listListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
} from '../controllers/listings.controller.js';

const router = Router();

router.get('/', listListings);
router.get('/:id', getListing);
router.post('/', authRequired, createListing);
router.put('/:id', authRequired, updateListing);
router.delete('/:id', authRequired, deleteListing);

export default router;
