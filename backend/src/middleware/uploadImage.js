const multer = require('multer');

// In-memory storage for image processing
const multerStorage = multer.memoryStorage();

const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('File received:', file);
    if (
      file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/png' ||
      file.mimetype === 'image/webp'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WEBP image formats are allowed'), false);
    }
  }
});

const uploadImage = upload.single('file'); // 'file' is the form-data field name
const uploadImages = upload.array('files', 5); // 'files' is the form-data field name, max 5 files

module.exports = { uploadImage, uploadImages };
