import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './services/db.service';
import repoRoutes from './routes/repo.routes';
import architectureRoutes from './routes/architecture.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());

app.use('/api/repo', repoRoutes);
app.use('/api/architecture', architectureRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();