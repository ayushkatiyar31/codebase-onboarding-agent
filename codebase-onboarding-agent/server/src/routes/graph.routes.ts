import { Router } from 'express';
import { generateGraph, getGraph } from '../controllers/graph.controller';

const router = Router();

router.post('/:owner/:name/generate', generateGraph);
router.get('/:owner/:name', getGraph);

export default router;