"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_service_1 = require("./services/db.service");
const repo_routes_1 = __importDefault(require("./routes/repo.routes"));
const analysis_routes_1 = __importDefault(require("./routes/analysis.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express_1.default.json());
app.use('/api/repo', repo_routes_1.default);
app.use('/api/analysis', analysis_routes_1.default);
app.use('/api/chat', chat_routes_1.default);
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
const startServer = async () => {
    try {
        await (0, db_service_1.connectDB)();
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
