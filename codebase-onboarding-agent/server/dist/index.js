"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_service_js_1 = require("./services/db.service.js");
const repo_routes_js_1 = __importDefault(require("./routes/repo.routes.js"));
// Load environment variables from .env file
// Must be called before anything that reads process.env
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// --- Middleware ---
// Middleware = functions that run on every request before your route handler
// CORS: tells the browser "it's okay for requests from CLIENT_URL to reach this server"
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
}));
// express.json(): parses incoming request bodies that have Content-Type: application/json
// Without this, req.body would be undefined when your frontend POSTs JSON
app.use(express_1.default.json());
// --- Routes ---
// Any request starting with /api/repo will be handled by repoRoutes
app.use('/api/repo', repo_routes_js_1.default);
// Health check — a simple endpoint to confirm the server is alive
// Hit http://localhost:5000/health in your browser to test
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// --- Start server ---
const startServer = async () => {
    try {
        await (0, db_service_js_1.connectDB)(); // Connect to MongoDB first
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1); // Exit with error code if startup fails
    }
};
startServer();
