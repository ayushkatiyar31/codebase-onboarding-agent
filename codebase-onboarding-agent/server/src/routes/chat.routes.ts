import { Router } from 'express';
import { embedRepo, embedRepoStream, askQuestion } from '../controllers/chat.controller';

const router = Router();

router.post('/:owner/:name/embed', embedRepo);
router.get('/:owner/:name/embed/stream', embedRepoStream);
router.post('/:owner/:name/ask', askQuestion);

export default router;