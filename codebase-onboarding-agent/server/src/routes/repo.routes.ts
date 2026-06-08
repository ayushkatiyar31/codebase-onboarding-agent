import { Router } from 'express';
import { ingestRepo, getRepo, getFileContent, chunkRepo } from '../controllers/repo.controller';

const router = Router();

router.post('/ingest', ingestRepo);
router.get('/:owner/:name', getRepo);
router.get('/:owner/:name/file', getFileContent);   // ← new
router.post('/:owner/:name/chunk', chunkRepo);       // ← new

export default router;