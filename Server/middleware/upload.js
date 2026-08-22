'use strict';
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subfolder = 'others';
    const url = req.originalUrl || '';
    if (url.includes('/banners')) {
      subfolder = 'banners';
    } else if (url.includes('/products')) {
      subfolder = 'products';
    } else if (url.includes('/categories')) {
      subfolder = 'categories';
    } else if (url.includes('/site-settings')) {
      subfolder = 'settings';
    } else if (url.includes('/affiliates')) {
      subfolder = 'affiliates';
    } else if (url.includes('/returns')) {
      subfolder = 'returns';
    }

    const dest = path.join(__dirname, '..', 'uploads', subfolder);

    const fs = require('fs');
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif|pdf|glb|gltf|mp4|webm|mov|avi|mkv|quicktime|m4v/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype) || file.mimetype.includes('model') || file.mimetype.includes('video') || file.mimetype.includes('pdf');
  cb(null, ext || mime);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

module.exports = upload;
