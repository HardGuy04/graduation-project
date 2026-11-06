// /api/specialties — công khai (thêm/sửa/xóa nằm ở /api/admin/specialties)
import { Router } from 'express';
import * as c from '../controllers/specialty.controller.js';

const router = Router();

router.get('/', c.list);
router.get('/:id', c.get);

export default router;
