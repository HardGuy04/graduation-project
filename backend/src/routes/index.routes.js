// ─────────────────────────────────────────────────────────────────────────────
// Router tổng hợp — gom tất cả module routes vào /api/*
// ─────────────────────────────────────────────────────────────────────────────
const { Router } = require('express');
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const doctorRoutes = require('./doctor.routes');
const patientRoutes = require('./patient.routes');
const specialtyRoutes = require('./specialty.routes');
const chatbotRoutes = require('./chatbot.routes');

const router = Router();

// Public routes
router.use('/auth', authRoutes);             // POST /api/auth/login, /register, ...
router.use('/specialties', specialtyRoutes); // GET  /api/specialties

// Protected routes (từng module tự gắn middleware auth + role bên trong)
router.use('/admin', adminRoutes);           // /api/admin/*
router.use('/doctor', doctorRoutes);         // /api/doctor/*
router.use('/patient', patientRoutes);       // /api/patient/*
router.use('/chatbot', chatbotRoutes);       // /api/chatbot/*

module.exports = router;
