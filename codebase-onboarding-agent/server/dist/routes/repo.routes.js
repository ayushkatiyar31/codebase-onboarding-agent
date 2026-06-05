"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const repo_controller_js_1 = require("../controllers/repo.controller.js");
const router = (0, express_1.Router)();
// POST /api/repo/ingest
// Body: { repoUrl: "https://github.com/owner/repo" }
router.post('/ingest', repo_controller_js_1.ingestRepo);
// GET /api/repo/:owner/:name
// e.g. GET /api/repo/expressjs/express
router.get('/:owner/:name', repo_controller_js_1.getRepo);
exports.default = router;
