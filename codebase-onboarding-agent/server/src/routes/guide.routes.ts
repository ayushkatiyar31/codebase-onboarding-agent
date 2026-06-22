import { Router } from 'express';
import { createGuide, getGuide, getSharedGuide } from '../controllers/guide.controller';

const router = Router();

router.post('/:owner/:name/generate', createGuide);
router.get('/:owner/:name', getGuide);
router.get('/shared/:shareId', getSharedGuide); 

export default router;