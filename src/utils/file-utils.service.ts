import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as util from 'util';

@Injectable()
export class FileUtilsService {
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
}

/*
 
filePaths must be string array

filePaths = ['uploads/admin/example.jpg', 'uploads/admin/avatar/avatar.jpeg']

*/