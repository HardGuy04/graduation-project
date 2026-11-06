// /api/admin — quản trị viên (kiêm lễ tân)
import { Router } from 'express';
import authenticate from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/role.middleware.js';
import { ROLES } from '../utils/constants.js';
import * as admin from '../controllers/admin.controller.js';
import * as doctor from '../controllers/doctor.controller.js';
import * as patient from '../controllers/patient.controller.js';
import * as specialty from '../controllers/specialty.controller.js';
import * as room from '../controllers/room.controller.js';
import * as schedule from '../controllers/schedule.controller.js';
import * as invoice from '../controllers/invoice.controller.js';
import * as stats from '../controllers/stats.controller.js';
import * as income from '../controllers/Income.controller.js';

const router = Router();
router.use(authenticate, authorize(ROLES.ADMIN));

// Tài khoản
router.get('/users', admin.listUsers);
router.post('/users', admin.createUser);
router.get('/users/:id', admin.getUser);
router.patch('/users/:id', admin.updateUser);
router.patch('/users/:id/status', admin.setStatus);
router.post('/users/:id/reset-password', admin.resetPassword);

// Hồ sơ bác sĩ / bệnh nhân
router.get('/doctors', doctor.listAdmin);
router.get('/doctors/:id', doctor.getAdmin);
router.patch('/doctors/:id', doctor.updateByAdmin);

// Lịch làm việc & ngày nghỉ của bác sĩ
router.get('/doctors/:doctorId/schedules', schedule.doctorSchedules);
router.post('/doctors/:doctorId/schedules', schedule.createDoctorSchedule);
router.patch('/doctors/:doctorId/schedules/:id', schedule.updateDoctorSchedule);
router.delete('/doctors/:doctorId/schedules/:id', schedule.deleteDoctorSchedule);
router.get('/doctors/:doctorId/leaves', schedule.doctorLeaves);
router.post('/doctors/:doctorId/leaves', schedule.createDoctorLeave);
router.delete('/doctors/:doctorId/leaves/:id', schedule.deleteDoctorLeave);
router.get('/leaves', schedule.allLeaves);

router.get('/patients', patient.listAdmin);
router.get('/patients/:id', patient.getAdmin);
router.get('/patients/:id/wallet', invoice.patientWallet);
router.get('/patients/:id/wallet/transactions', invoice.patientWalletTransactions);
router.post('/patients/:id/wallet/topup', invoice.topupForPatient);

// Hóa đơn
router.get('/invoices', invoice.list);
router.post('/invoices', invoice.create);
router.get('/invoices/:id', invoice.get);
router.patch('/invoices/:id/pay', invoice.payOffline);

// Báo cáo
router.get('/stats/overview', stats.overview);
router.get('/stats/visits', stats.visits);
router.get('/stats/by-doctor', stats.byDoctor);
router.get('/stats/by-specialty', stats.bySpecialty);
router.get('/stats/revenue', stats.revenue);
router.get('/stats/cancellation', stats.cancellation);

// Thu nhập bác sĩ
router.get('/incomes', income.listByMonth);
router.put('/incomes/:doctorId/:month', income.upsert);

// Chuyên khoa
router.get('/specialties', specialty.list);
router.post('/specialties', specialty.create);
router.patch('/specialties/:id', specialty.update);
router.delete('/specialties/:id', specialty.remove);

// Phòng ('/rooms/available' phải đứng trước '/rooms/:id')
router.get('/rooms', room.list);
router.get('/rooms/available', room.available);
router.get('/rooms/:id', room.get);
router.post('/rooms', room.create);
router.patch('/rooms/:id', room.update);
router.delete('/rooms/:id', room.remove);

export default router;
