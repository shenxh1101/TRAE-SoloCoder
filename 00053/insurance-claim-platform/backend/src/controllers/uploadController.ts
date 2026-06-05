import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ApiResponse } from '../types';
import { processImageAssessment, ExtractedAssessmentData, HistoricalComparison } from '../utils/ocr';

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'assessment-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|bmp|tiff/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: fileFilter
});

export async function uploadAssessment(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded'
      } as ApiResponse);
      return;
    }

    const imagePath = req.file.path;

    try {
      const result = await processImageAssessment(imagePath);

      res.json({
        success: true,
        data: {
          file: {
            originalname: req.file.originalname,
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype
          },
          extracted: result.extracted,
          comparison: result.comparison
        },
        message: 'Image processed successfully'
      } as ApiResponse<{
        file: {
          originalname: string;
          filename: string;
          size: number;
          mimetype: string;
        };
        extracted: ExtractedAssessmentData;
        comparison?: HistoricalComparison;
      }>);
    } catch (ocrError) {
      console.error('OCR processing error:', ocrError);
      res.status(500).json({
        success: false,
        error: 'Failed to process image with OCR',
        data: {
          file: {
            originalname: req.file.originalname,
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype
          }
        }
      } as ApiResponse);
    }
  } catch (error) {
    console.error('Upload assessment error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    } as ApiResponse);
  }
}

export default {
  upload,
  uploadAssessment
};
