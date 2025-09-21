import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './db-init.js';

import apiRoutes from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for things like logo uploads

// --- Static File Serving for Uploads ---
// On Railway, the volume is mounted at /storage. Locally, we'll use a directory.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = process.env.NODE_ENV === 'production' ? '/storage/uploads' : path.join(__dirname, 'uploads');

// Create the directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`Created upload directory at: ${uploadDir}`);
}

// Serve files from the uploads directory at the /uploads route
app.use('/uploads', express.static(uploadDir));
console.log(`Serving static files from ${uploadDir} at /uploads`);

// API Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.send('BrainLeaf Backend is running!');
});

// Initialize DB and then start server
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch(error => {
    console.error("Failed to initialize database or start server:", error);
    process.exit(1);
});
