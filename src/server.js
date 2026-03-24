const path = require('path');
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

const corsOrigin = env.nodeEnv === 'production' ? true : env.frontendUrl;

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
  },
});

// Middlewares globais
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '10mb' }));

const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth.routes');
const webhookRoutes = require('./routes/webhook.routes');
const leadsRoutes = require('./routes/leads.routes');
const vendedoresRoutes = require('./routes/vendedores.routes');
const followupsRoutes = require('./routes/followups.routes');
const metasRoutes = require('./routes/metas.routes');
const callsRoutes = require('./routes/calls.routes');
const relatoriosRoutes = require('./routes/relatorios.routes');
const adminRoutes = require('./routes/admin.routes');
const whatsappRoutes = require('./routes/whatsapp.routes');
const templatesRoutes = require('./routes/templates.routes');
const printsRoutes = require('./routes/prints.routes');
const notificacoesRoutes = require('./routes/notificacoes.routes');
const perfilRoutes = require('./routes/perfil.routes');
const { iniciarSlaChecker } = require('./jobs/slaChecker.job');
const { iniciarWhatsappDispatcher } = require('./jobs/whatsappDispatcher.job');

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
app.use('/api/calls', callsRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/prints', printsRoutes);
app.use('/api/notificacoes', notificacoesRoutes);
app.use('/api/perfil', perfilRoutes);

// Servir uploads (prints, calls) como arquivos estaticos
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// WebSocket
io.on('connection', (socket) => {
  logger.info(`WebSocket client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    logger.info(`WebSocket client disconnected: ${socket.id}`);
  });
});

// Disponibilizar io para os controllers
app.set('io', io);

// Servir frontend estático (produção)
const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendPath));

// SPA fallback — rotas não-API redirecionam para index.html
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/') || req.path.startsWith('/socket.io')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
    if (err) next();
  });
});

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
    await iniciarWhatsappDispatcher();
  } catch (err) {
    logger.error(`Erro ao iniciar jobs: ${err.message}`);
  }
});

module.exports = { app, io, server };
