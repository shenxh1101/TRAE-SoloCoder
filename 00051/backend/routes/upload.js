const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'inspection-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件 (JPG, PNG, GIF)'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: fileFilter
});

router.post('/inspection-photo', authenticateToken, upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的文件' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      message: '上传成功',
      filename: req.file.filename,
      url: fileUrl,
      path: req.file.path
    });
  } catch (error) {
    console.error('上传照片错误:', error);
    res.status(500).json({ error: '上传失败: ' + error.message });
  }
});

router.post('/inspection-photos', authenticateToken, upload.array('photos', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '请选择要上传的文件' });
    }

    const files = req.files.map(file => ({
      filename: file.filename,
      url: `/uploads/${file.filename}`,
      path: file.path
    }));
    
    res.json({
      message: '上传成功',
      files: files
    });
  } catch (error) {
    console.error('上传照片错误:', error);
    res.status(500).json({ error: '上传失败: ' + error.message });
  }
});

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小不能超过5MB' });
    }
    return res.status(400).json({ error: '文件上传错误: ' + error.message });
  }
  res.status(500).json({ error: error.message || '上传失败' });
});

module.exports = router;
