// /api/doctors — công khai (danh sách bác sĩ, khung giờ trống)
// /api/doctor  — bác sĩ tự quản lý (lịch làm việc, ngày nghỉ, bệnh nhân, bệnh án)
import { Router } from 'express';
import authenticate from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/role.middleware.js';
import { ROLES } from '../utils/constants.js';
import * as doctor from '../controllers/doctor.controller.js';
import * as schedule from '../controllers/schedule.controller.js';
import * as patient from '../controllers/patient.controller.js';
import * as record from '../controllers/medicalRecord.controller.js';
import * as income from '../controllers/Income.controller.js';

export const publicDoctorRouter = Router();
publicDoctorRouter.get('/', doctor.listPublic);
publicDoctorRouter.get('/:id', doctor.getPublic);
publicDoctorRouter.get('/:id/schedules', schedule.publicSchedules);
publicDoctorRouter.get('/:id/slots', schedule.slots);

const router = Router();
router.use(authenticate, authorize(ROLES.DOCTOR));

router.get('/schedules', schedule.mySchedules);
router.post('/schedules', schedule.createMySchedule);
router.patch('/schedules/:id', schedule.updateMySchedule);
router.delete('/schedules/:id', schedule.deleteMySchedule);
router.get('/leaves', schedule.myLeaves);
router.post('/leaves', schedule.createMyLeave);
router.delete('/leaves/:id', schedule.deleteMyLeave);

router.get('/patients', patient.listForDoctor);
router.get('/patients/:id', patient.getForDoctor);
router.get('/patients/:id/history', record.patientHistory);

router.get('/medical-records', record.list);
router.post('/medical-records', record.create);
router.get('/medical-records/:id', record.get);
router.patch('/medical-records/:id', record.update);
router.put('/medical-records/:id/prescription', record.setPrescription);

router.get('/incomes', income.listMine);

export default router;
