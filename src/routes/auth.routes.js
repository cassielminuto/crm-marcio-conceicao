const { Router } = require('express');
const { z } = require('zod');
const authController = require('../controllers/auth.controller');
const autenticar = require('../middleware/auth');
const validar = require('../middleware/validator');

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Senha é obrigatória'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
});

router.post('/login', validar(loginSchema), authController.login);
router.post('/refresh', validar(refreshSchema), authController.refresh);
router.get('/me', autenticar, authController.me);

module.exports = router;
