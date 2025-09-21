import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { protect } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// A simple in-memory cache for settings
let settingsCache = null;
let cacheTimestamp = 0;

// --- Multer Configuration for File Uploads ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Save to the volume in production, or a local folder in development
    const uploadDir = process.env.NODE_ENV === 'production' ? '/storage/uploads' : 'uploads';
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const mimetype = allowedTypes.test(file.mimetype);
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Error: File upload only supports the following filetypes - ' + allowedTypes));
    }
});

// --- DYNAMIC DATA LOADER ---
// This function acts like a simple data access layer.
const getData = async (table) => db.query(`SELECT * FROM ${table}`);

// In a real app, you'd handle inserts, updates, deletes individually.
// For this project, this simplified "bulk save" is for mock API parity and logging.
const saveData = async (table, data) => {
    console.log(`A save operation was requested for table: ${table}. Data not persisted by this endpoint. Seeding is the source of truth.`);
    return { message: `${table} data save operation handled.` };
};

// --- AUTH ROUTE ---
router.post('/auth/login', async (req, res) => {
    const { emailOrUsername, password } = req.body;
    if (!emailOrUsername || !password) {
        return res.status(400).json({ message: 'Email/Username and password are required.' });
    }
    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1 OR username = $1', [emailOrUsername]);
        const user = result.rows[0];

        if (user && await bcrypt.compare(password, user.password)) {
            // In a real app, you'd update lastLogin here.
            
            const userPayload = {
                id: user.id,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar,
                email: user.email,
                childrenIds: user.childrenIds,
            };

            const token = jwt.sign(
                userPayload,
                process.env.JWT_SECRET || 'your_default_jwt_secret',
                { expiresIn: '1d' }
            );
            
            // Return the full user object needed by the frontend, but without the password hash.
            const { password: _, ...userWithoutPassword } = user;
            res.json({ token, user: userWithoutPassword });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (e) {
        console.error('Login Error:', e);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// --- FILE UPLOAD ROUTE ---
router.post('/upload', protect, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }
  // Return the web-accessible path to the file
  const filePath = `/uploads/${req.file.filename}`;
  res.json({ filePath });
});


// --- GENERIC GET ROUTE ---
const resources = [
    'users', 'programs', 'enrollments', 'sessions', 'assignments',
    'credit_transactions', 'assets', 'availability_slots', 'unavailability',
    'cancellation_requests', 'messages', 'conversations', 'announcements',
    'audit_logs', 'revenue_transactions'
];

resources.forEach(resource => {
    router.get(`/${resource}`, protect, async (req, res) => {
        try {
            const { rows } = await getData(resource);
            res.json(rows);
        } catch (err) {
            console.error(`Error fetching ${resource}:`, err);
            res.status(500).send(`Server error fetching ${resource}`);
        }
    });
});

// --- GENERIC SAVE (BULK POST) ROUTE ---
resources.forEach(resource => {
    router.post(`/${resource}`, protect, async (req, res) => {
        const data = req.body;
        // This is a simplified "save" that just acknowledges the request for mock API functionality.
        // A real-world POST would handle individual record creation/updates.
        try {
            const result = await saveData(resource, data);
            res.json(result);
        } catch (err) {
            console.error(`Error saving ${resource}:`, err);
            res.status(500).send(`Server error saving ${resource}`);
        }
    });
});

// --- Settings specific routes ---
// Settings are public for login page styling, so no `protect` middleware
router.get('/settings', async (req, res) => {
  // Use a simple time-based cache to avoid hitting the DB on every single render
  const now = Date.now();
  if (settingsCache && (now - cacheTimestamp < 5000)) { // 5 second cache
      return res.json(settingsCache);
  }

  try {
    const result = await db.query('SELECT settings FROM platform_settings WHERE id = 1');
    if (result.rows.length > 0) {
      settingsCache = result.rows[0].settings;
      cacheTimestamp = now;
      res.json(settingsCache);
    } else {
      res.status(404).json({ message: 'Settings not found.' });
    }
  } catch (e) {
    console.error('Error fetching settings:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/settings', protect, async (req, res) => {
  const newSettings = req.body;
  try {
    const result = await db.query('UPDATE platform_settings SET settings = $1 WHERE id = 1 RETURNING settings', [newSettings]);
    settingsCache = result.rows[0].settings; // Update cache
    cacheTimestamp = Date.now();
    res.json(settingsCache);
  } catch (e) {
    console.error('Error updating settings:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Curriculum progress specific routes ---
router.get('/curriculum_progress', protect, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM curriculum_progress');
        const progressMap = rows.reduce((acc, row) => {
            acc[row.enrollment_id] = {
                enrollmentId: row.enrollment_id,
                programTitle: row.program_title,
                structure: row.structure,
            };
            return acc;
        }, {});
        res.json(progressMap);
    } catch(e) {
        console.error('Error fetching curriculum progress:', e);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/curriculum_progress', protect, async (req, res) => {
    const progressMap = req.body;
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        // Simple replace for mock functionality. A real app would use UPSERT.
        await client.query('TRUNCATE TABLE curriculum_progress'); 
        for (const enrollmentId in progressMap) {
            const progress = progressMap[enrollmentId];
            await client.query(
                'INSERT INTO curriculum_progress (enrollment_id, program_title, structure) VALUES ($1, $2, $3)',
                [enrollmentId, progress.programTitle, JSON.stringify(progress.structure)]
            );
        }
        await client.query('COMMIT');
        res.json({ message: 'Curriculum progress saved.' });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error saving curriculum progress:', e);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
});


export default router;