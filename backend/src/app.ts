import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';
import userRoutes from './routes/users';
import aiRoutes from './routes/ai';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
