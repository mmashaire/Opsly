import express from 'express';
import { json } from 'body-parser';
import { createServer } from 'http';
import { setupRoutes } from './interfaces/http/routes/index';
import { connectDatabase } from './config/index';

const app = express();
const server = createServer(app);

// Middleware
app.use(json());

// Database connection
connectDatabase();

// Setup routes
setupRoutes(app);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});