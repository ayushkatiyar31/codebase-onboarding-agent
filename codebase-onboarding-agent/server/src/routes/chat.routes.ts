import { Router } from 'express';
import { embedRepo, embedRepoStream, askQuestion, getEmbeddingStatus } from '../controllers/chat.controller';

const router = Router();

router.get('/:owner/:name/status',       getEmbeddingStatus);
router.post('/:owner/:name/embed',       embedRepo);
router.get('/:owner/:name/embed/stream', embedRepoStream);
router.post('/:owner/:name/ask',         askQuestion);

export default router;