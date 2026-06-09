import { Router } from 'express';
import { streamAnalysis, saveAnalysis, clearAnalysisCache } from '../controllers/analysis.controller';

const router = Router();

router.get('/:owner/:name/stream', streamAnalysis);
router.post('/:owner/:name/save',  saveAnalysis);
router.delete('/:owner/:name/cache', clearAnalysisCache);

export default router;