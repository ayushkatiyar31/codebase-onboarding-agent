import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './services/db.service';
import repoRoutes from './routes/repo.routes';

// Load environment variables from .env file
// Must be called before anything that reads process.env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
// Middleware = functions that run on every request before your route handler

// CORS: tells the browser "it's okay for requests from CLIENT_URL to reach this server"
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

// express.json(): parses incoming request bodies that have Content-Type: application/json
// Without this, req.body would be undefined when your frontend POSTs JSON
app.use(express.json());

// --- Routes ---
// Any request starting with /api/repo will be handled by repoRoutes
app.use('/api/repo', repoRoutes);

// Health check — a simple endpoint to confirm the server is alive
// Hit http://localhost:5000/health in your browser to test
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Start server ---
const startServer = async () => {
  try {
    await connectDB(); // Connect to MongoDB first
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1); // Exit with error code if startup fails
  }
};

startServer();