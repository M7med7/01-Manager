import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';
import userRoutes from './routes/users';
import aiRoutes from './routes/ai';

dotenv.config();

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] blocked origin: ${origin}`);
        callback(new Error(`CORS: origin "${origin}" not allowed`));
      }
    },
  })
);
app.use(express.json());

app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
import cvRoutes from './routes/cv';
app.use('/api/users', cvRoutes);
app.use('/api/ai', aiRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
