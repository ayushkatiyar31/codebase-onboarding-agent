"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const repo_controller_1 = require("../controllers/repo.controller");
const router = (0, express_1.Router)();
router.post('/ingest', repo_controller_1.ingestRepo);
router.get('/:owner/:name', repo_controller_1.getRepo);
router.get('/:owner/:name/file', repo_controller_1.getFileContent); // ← new
router.post('/:owner/:name/chunk', repo_controller_1.chunkRepo); // ← new
exports.default = router;
