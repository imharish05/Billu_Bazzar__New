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
  const extName = path.extname(file.originalname).toLowerCase();
  
  // Explicitly block executable, HTML, SVG, and script files to prevent Stored XSS / RCE
  const blocked = /\.(html?|svg|php|phtml|js|ts|sh|bat|cmd|exe|cgi|asp|aspx|py|pl|jar)$/i;
  if (blocked.test(extName)) {
    return cb(new Error('File type is not permitted for security reasons.'), false);
  }

  const allowedExts = /\.(jpe?g|png|webp|gif|pdf|glb|gltf|mp4|webm|mov|avi|mkv)$/i;
  const ext = allowedExts.test(extName);
  const allowedMime = /^image\/(jpeg|png|webp|gif)|^application\/pdf|^video\/(mp4|webm|quicktime|x-msvideo)|^model\/(gltf|gltf-binary)/i.test(file.mimetype);

  if (ext && (allowedMime || file.mimetype.includes('octet-stream'))) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only standard images, videos, 3D models, and PDFs are allowed.'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

module.exports = upload;
