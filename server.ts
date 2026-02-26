
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Project state storage (in-memory for this demo)
  const projects: Record<string, { lyrics: string, playback: { active: boolean, time: number } }> = {};

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-project', (projectId) => {
      socket.join(projectId);
      console.log(`User ${socket.id} joined project ${projectId}`);
      
      // Send current state if exists
      if (projects[projectId]) {
        socket.emit('sync-state', projects[projectId]);
      } else {
        projects[projectId] = { lyrics: '', playback: { active: false, time: 0 } };
      }
    });

    socket.on('update-lyrics', ({ projectId, lyrics }) => {
      if (projects[projectId]) {
        projects[projectId].lyrics = lyrics;
        socket.to(projectId).emit('lyrics-updated', lyrics);
      }
    });

    socket.on('update-playback', ({ projectId, active, time }) => {
      if (projects[projectId]) {
        projects[projectId].playback = { active, time };
        socket.to(projectId).emit('playback-updated', { active, time });
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
