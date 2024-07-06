import { diskStorage } from 'multer';

export const blogMulterConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = './uploads/blog/'; // Destination folder for admin

      cb(null, uploadPath);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Accept image files only
    if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|mp4|avi|mkv|mov)$/)) {
      return cb(new Error('Only image and video files are allowed!'), false);
    }
    cb(null, true);
  },
};
