import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import apiRoutes from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for things like logo uploads

// API Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.send('BrainLeaf Backend is running!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
