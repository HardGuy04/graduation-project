import { Router } from 'express';
import authenticate from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/role.middleware.js';
import { ROLES } from '../utils/constants.js';
import { predictDisease, getMedicinesByDisease } from '../controllers/recomend.controller.js';

const router = Router();

// POST /api/ai/predict-disease (Bác sĩ hoặc Admin)
router.post('/predict-disease', authenticate, authorize(ROLES.DOCTOR, ROLES.ADMIN), predictDisease);

// GET /api/ai/medicines-by-disease (Bác sĩ hoặc Admin)
router.get('/medicines-by-disease', authenticate, authorize(ROLES.DOCTOR, ROLES.ADMIN), getMedicinesByDisease);

export default router;

