import { createLogger, format, transports } from 'winston';

class AuditLogger {
    private logger;

    constructor() {
        this.logger = createLogger({
            level: 'info',
            format: format.combine(
                format.timestamp(),
                format.json()
            ),
            transports: [
                new transports.Console(),
                new transports.File({ filename: 'audit.log' })
            ]
        });
    }

    logAction(action: string, details: object) {
        this.logger.info({
            action,
            details,
            timestamp: new Date().toISOString()
        });
    }
}

export default new AuditLogger();