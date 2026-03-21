import { Router } from 'express';

const router = Router();

export const healthCheckRoute = () => {
    router.get('/health', (req, res) => {
        res.status(200).json({ status: 'ok' });
    });

    return router;
};