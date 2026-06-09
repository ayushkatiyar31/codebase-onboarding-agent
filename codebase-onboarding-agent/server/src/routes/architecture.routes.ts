import { Router } from 'express';
import {
  analyseArchitecture,
  streamArchitectureExplanation,
} from '../controllers/architecture.controller';

const router = Router();

router.post('/:owner/:name/analyse', analyseArchitecture);

router.get('/:owner/:name/stream', streamArchitectureExplanation);

export default router;