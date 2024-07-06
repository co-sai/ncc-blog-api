import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) { }

  use(req: Request, res: Response, next: NextFunction) {
    // this.logger.info(`${req.method} ${req.url}`);

    const originalSend = res.send;
    res.send = (body) => {
      if (res.statusCode >= 400) {
        const errorResponse = typeof body === 'string' ? JSON.parse(body) : body;
        const errorMessage = errorResponse.message || 'No error message';
        const stackTrace = new Error().stack;
        // this.logger.error(`Error: ${errorMessage}\nStack: ${stackTrace}`);
      }
      res.send = originalSend;
      return res.send(body);
    };

    res.on('finish', () => {
    //   this.logger.info(`${res.statusCode} ${res.statusMessage}`);
    });

    next();
  }
}
