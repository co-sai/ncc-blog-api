import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Inject } from '@nestjs/common';
import { Logger as WinstonLogger } from 'winston';

interface UploadedFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    destination: string;
    filename: string;
    path: string;
    size: number;
}

interface RequestFiles {
    [fieldName: string]: UploadedFile[] | undefined;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    constructor(
        // private fileUtilService: FileUtilsService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: WinstonLogger,
    ) { }

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal Server Error';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            message = exception.message;
        } else if (exception instanceof Error) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = exception.message;
        }

        let logMessage = `${status} ${message} ${request.method} ${request.url}`;

        if (exception instanceof Error && exception.stack) {
            // Log the full stack trace
            this.logger.error(`${logMessage}\nStack: ${exception.stack}`);
        } else {
            this.logger.error(logMessage);
        }

        // Handle file deletion logic for specific exceptions
        if (request.files) {
            const files = request.files as RequestFiles;
            let filenames: string[] = [];

            // Iterate through each field in the request
            Object.values(files).forEach(field => {
                if (field && field.length > 0) {
                    // If the field contains uploaded files, collect their paths
                    for (const file of field) {
                        filenames.push(path.join(process.cwd(), file.path));
                    }
                }
            });

            // Delete the collected files
            this.deleteFiles(filenames);
        } else if (request.file) {
            const file = request.file;
            const filePath = path.join(process.cwd(), file.path);

            // Delete the uploaded file
            this.deleteFiles([filePath]);
        }

        response.status(status).json({
            statusCode: status,
            message: message,
        });
    }

    private async deleteFiles(filePaths: string[]): Promise<void> {
        try {
          const unlinkAsync = util.promisify(fs.unlink);
    
          // Iterate over the file paths and delete each file
          await Promise.all(filePaths.map(async (filePath) => {
            try {
              // Check if the file exists
              await fs.promises.access(filePath, fs.constants.F_OK);
    
              // If the file exists, delete it
              await unlinkAsync(filePath);
              // console.log(`File ${filePath} deleted successfully`);
            } catch (error) {
              // If the file does not exist, log a message
              // console.warn(`File ${filePath} does not exist`);
            }
          }));
    
          console.log('All files deleted successfully');
        } catch (error) {
          console.error('Error deleting files:', error);
          throw new Error('Failed to delete files');
        }
      }

}
