import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// A simple in-memory cache for settings
let settingsCache = null;
let cacheTimestamp = 0;

// --- DYNAMIC DATA LOADER ---
// This function acts like a simple data access layer.
const getData = async (table) => db.query(`SELECT * FROM ${table}`);
const saveData = async (table, data) => {
    // This is a placeholder for a more robust save.
    // In a real app, you'd handle inserts, updates, deletes individually.
    // For this project, we'll just log that a save was requested.
    console.log(`A save operation was requested for table: ${table}`);
    return { message: `${table} data save handled.` };
};

// --- AUTH ROUTE ---
router.post('/auth/login', async (req, res) => {
    const { emailOrUsername, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1 OR username = $1', [emailOrUsername]);
        const user = result.rows[0];

        if (user && await bcrypt.compare(password, user.password)) {
            // In a real app, you'd update lastLogin, etc.
            const token = jwt.sign(
                { id: user.id, role: user.role, firstName: user.firstName, lastName: user.lastName, avatar: user.avatar },
                process.env.JWT_SECRET || 'your_default_jwt_secret',
                { expiresIn: '1d' }
            );
            const { password: _, ...userWithoutPassword } = user;
            res.json({ token, user: userWithoutPassword });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error during login' });
    }
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
        // This is a simplified "save" that just replaces the data for the mock API functionality.
        // A real-world POST would handle individual record creation/updates.
        try {
            // For now, we simulate saving by just acknowledging. The seed script is the source of truth.
            const result = await saveData(resource, data);
            res.json(result);
        } catch (err) {
            console.error(`Error saving ${resource}:`, err);
            res.status(500).send(`Server error saving ${resource}`);
        }
    });
});

// --- Settings specific routes ---
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
        await client.query('TRUNCATE TABLE curriculum_progress'); // Simple replace for mock functionality
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