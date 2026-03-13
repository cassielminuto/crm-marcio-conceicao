const env = require('./config/env');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
const logger = require('./utils/logger');
const prisma = require('./config/database');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.frontendUrl,
    methods: ['GET', 'POST'],
  },
});

// Middlewares globais
app.use(helmet());
app.use(cors({ origin: env.frontendUrl }));
app.use(express.json({ limit: '10mb' }));

const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth.routes');
const webhookRoutes = require('./routes/webhook.routes');
const leadsRoutes = require('./routes/leads.routes');
const vendedoresRoutes = require('./routes/vendedores.routes');
const followupsRoutes = require('./routes/followups.routes');
const metasRoutes = require('./routes/metas.routes');
const { iniciarSlaChecker } = require('./jobs/slaChecker.job');

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/vendedores', vendedoresRoutes);
app.use('/api/followups', followupsRoutes);
app.use('/api/metas', metasRoutes);

// WebSocket
io.on('connection', (socket) => {
  logger.info(`WebSocket client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    logger.info(`WebSocket client disconnected: ${socket.id}`);
  });
});

// Disponibilizar io para os controllers
app.set('io', io);

// Error handler (deve ser o último middleware)
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start
server.listen(env.port, async () => {
  logger.info(`Server running on port ${env.port} (${env.nodeEnv})`);

  // Iniciar SLA Checker (BullMQ)
  try {
    await iniciarSlaChecker(io);
  } catch (err) {
    logger.error(`Erro ao iniciar SLA Checker: ${err.message}`);
  }
});

module.exports = { app, io, server };
