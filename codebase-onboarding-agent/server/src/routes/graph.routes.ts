// server/src/routes/graph.routes.ts

import { Router } from 'express';
import { generateGraph, getGraph, getWalkthrough } from '../controllers/graph.controller';
// ↑ added getWalkthrough to the import

const router = Router();

router.post('/:owner/:name/generate', generateGraph);
router.get('/:owner/:name', getGraph);
router.get('/:owner/:name/walkthrough', getWalkthrough);

export default router;