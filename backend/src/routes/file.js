const express = require('express');
const router = express.Router();
const { validateUser } = require('../middleware/validateUser');
const uploadFile = require('../services/uploadFile');
const { uploadImage } = require('../middleware/uploadImage');

router.post('/upload', validateUser, uploadImage, async (req, res) => {
  try {
    const user = req.user;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    const uniqueFileName = `${Date.now()}-${file.originalname}`;

    uploadFile(file.buffer, `uploads/${user.email}/${uniqueFileName}`)
      .then(uploadedUrl => {
        res.status(201).json({ message: 'File uploaded successfully', fileUrl: uploadedUrl });
      })
      .catch(err => {
        console.error('File upload error:', err);
        res.status(500).json({ error: 'Failed to upload file' });
      });
      
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

module.exports = router;
