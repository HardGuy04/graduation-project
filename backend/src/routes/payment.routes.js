// Callback VNPay — không cần JWT (cổng thanh toán gọi/redirect)
import { Router } from 'express';
import * as payment from '../controllers/payment.controller.js';

const router = Router();
router.get('/config', payment.config);
router.get('/vnpay/return', payment.vnpayReturn);
router.get('/vnpay/ipn', payment.vnpayIpn);

export default router;
