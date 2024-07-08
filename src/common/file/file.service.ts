import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as util from 'util';
import { extname } from 'path';

@Injectable()
export class FileService {
    async deleteFiles(filePaths: string[]): Promise<void> {
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

    async generateFileName(id: string, file: any, path: string) {
        try {
            // Renaming the file to include admin._id
            const newFilename = `${id}${extname(file.originalname)}`;

            const oldPath = `./${path}/${file.filename}`;
            const newPath = `./${path}/${newFilename}`;
            fs.renameSync(oldPath, newPath);

            return newFilename;

        } catch (err) {
            throw err;
        }
    }

    async getFilenameFromUrl(url: string) {
        const parsedUrl = new URL(url);
        const pathname = parsedUrl.pathname;
        const segments = pathname.split('/');
        return segments.pop();
    }

    async deleteFilesIfExist(mediasFileName, newMediasFileName) {
        if (mediasFileName.length > 0) {
            await this.deleteFiles(mediasFileName);
        }
        if (newMediasFileName.length > 0) {
            await this.deleteFiles(newMediasFileName);
        }
    }
}
