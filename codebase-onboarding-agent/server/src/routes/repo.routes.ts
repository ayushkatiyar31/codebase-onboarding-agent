import { Router } from 'express';
import { ingestRepo, getRepo } from '../controllers/repo.controller';

const router = Router();

// POST /api/repo/ingest
// Body: { repoUrl: "https://github.com/owner/repo" }
router.post('/ingest', ingestRepo);

// GET /api/repo/:owner/:name
// e.g. GET /api/repo/expressjs/express
router.get('/:owner/:name', getRepo);

export default router;