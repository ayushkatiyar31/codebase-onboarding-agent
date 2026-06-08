import { Router } from 'express';
import { ingestRepo, getRepo } from '../controllers/repo.controller';

const router = Router();


router.post('/ingest', ingestRepo);

router.get('/:owner/:name', getRepo);

export default router;