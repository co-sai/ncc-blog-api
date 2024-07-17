import { diskStorage } from 'multer';

const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB in bytes

export const blogMulterConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = './uploads/blog/'; // Destination folder for admin
      cb(null, uploadPath);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Accept image files and video files with size limit
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
      cb(null, true);
    } else if (file.mimetype.match(/\/(mp4|avi|mkv|mov)$/)) {
      if (file.size > MAX_VIDEO_SIZE) {
        return cb(new Error('Video file size should be less than 10 MB'), false);
      }
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed!'), false);
    }
  },
  limits: {
    fileSize: MAX_VIDEO_SIZE, // Apply limits for the file size
  },
};
