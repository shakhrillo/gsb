const multer = require('multer');
const path = require('path');

// In-memory storage for image processing
const multerStorage = multer.memoryStorage();

const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if it's a valid image mimetype
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const isValidMimeType = validMimeTypes.includes(file.mimetype);
    
    // Check if it's application/octet-stream but has a valid image extension
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const isValidExtension = validExtensions.includes(fileExtension);
    const isOctetStreamWithImageExtension = file.mimetype === 'application/octet-stream' && isValidExtension;
    
    if (isValidMimeType || isOctetStreamWithImageExtension) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WEBP image formats are allowed'), false);
    }
  }
});

const uploadImage = upload.single('file'); // 'file' is the form-data field name
const uploadImages = upload.array('files', 5); // 'files' is the form-data field name, max 5 files

module.exports = { uploadImage, uploadImages };
