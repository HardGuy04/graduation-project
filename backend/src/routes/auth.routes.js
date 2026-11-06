// /api/auth/*
import { Router } from 'express';
import authenticate from '../middlewares/auth.middleware.js';
import * as c from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', c.register);
router.post('/login', c.login);
router.post('/refresh', c.refresh);
// Không yêu cầu access token: access token có thể đã hết hạn, giữ refresh token là đủ chứng minh
router.post('/logout', c.logout);

router.get('/me', authenticate, c.getMe);
router.patch('/me', authenticate, c.updateMe);
router.post('/change-password', authenticate, c.changePassword);

export default router;
