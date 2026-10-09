// /api/patient — bệnh nhân xem dữ liệu của CHÍNH MÌNH (danh tính lấy từ token, không nhận patientId từ client)
import { Router } from 'express';
import authenticate from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/role.middleware.js';
import { ROLES } from '../utils/constants.js';
import * as record from '../controllers/medicalRecord.controller.js';
import * as invoice from '../controllers/invoice.controller.js';
import * as patient from '../controllers/patient.controller.js';

const router = Router();
router.use(authenticate, authorize(ROLES.PATIENT));

router.get('/medical-records', record.list);
router.get('/medical-records/:id', record.get);

router.get('/invoices', invoice.list);
router.get('/invoices/:id', invoice.get);
router.post('/invoices/:id/pay-wallet', invoice.payWithWallet);
router.get('/wallet', invoice.myWallet);
router.get('/wallet/transactions', invoice.myWalletTransactions);
router.post('/wallet/topup', invoice.myTopup);

// '/notifications/read-all' và '/unread-count' phải đứng trước '/notifications/:id'
router.get('/notifications', patient.myNotifications);
router.get('/notifications/unread-count', patient.myUnreadCount);
router.patch('/notifications/read-all', patient.markAllNotificationsRead);
router.patch('/notifications/:id/read', patient.markNotificationRead);

export default router;
