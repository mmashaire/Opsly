import express from 'express';
import { setupHealthRoutes } from './routes/health';
import { setupItemRoutes } from './routes/items';

const app = express();

// Middleware
app.use(express.json());

// Setup routes
setupHealthRoutes(app);
setupItemRoutes(app);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

export default app;