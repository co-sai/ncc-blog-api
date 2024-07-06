import * as winston from 'winston';

export const winstonConfig = {
  level: 'info', // Log level
  handleExcept : true,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: './logs/app.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
      silent: true,
    }),
  ],
};
