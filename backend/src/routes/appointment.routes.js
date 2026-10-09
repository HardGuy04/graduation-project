// /api/appointments — dùng chung cho cả 3 vai trò; service tự giới hạn phạm vi dữ liệu theo người gọi
import { Router } from 'express';
import authenticate from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/role.middleware.js';
import { ROLES } from '../utils/constants.js';
import * as appt from '../controllers/appointment.controller.js';

const { ADMIN, DOCTOR, PATIENT } = ROLES;
const router = Router();
router.use(authenticate);

router.get('/', authorize(ADMIN, DOCTOR, PATIENT), appt.list);
router.get('/:id', authorize(ADMIN, DOCTOR, PATIENT), appt.get);
router.post('/', authorize(ADMIN, PATIENT), appt.create);
router.patch('/:id/cancel', authorize(ADMIN, PATIENT), appt.cancel);
router.patch('/:id/confirm', authorize(ADMIN), appt.confirm);
router.patch('/:id/check-in', authorize(ADMIN, DOCTOR), appt.checkIn);
router.patch('/:id/room', authorize(ADMIN), appt.changeRoom);
router.patch('/:id/no-show', authorize(ADMIN, DOCTOR), appt.noShow);

export default router;
