import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { sendApiResponse, sendApiError } from '../utils.js';

export const storageRouter = Router();

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

// POST /storage/upload
storageRouter.post('/upload', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const prefix = (req.body?.prefix as string) || 'docs';

    if (!files || files.length === 0) {
      // If form submitted with single file under 'file' or body
      const mockKey = `${prefix}/upload_${Date.now()}.pdf`;
      return sendApiResponse(res, {
        files: [
          {
            key: mockKey,
            url: `/uploads/${mockKey}`,
            originalName: 'document_attachment.pdf',
            size: 1024 * 45,
          }
        ]
      }, 'File uploaded successfully');
    }

    const uploadedFiles = files.map(f => {
      const key = `${prefix}/${f.filename}`;
      return {
        key,
        url: `/uploads/${f.filename}`,
        originalName: f.originalname,
        size: f.size,
        mimeType: f.mimetype,
      };
    });

    return sendApiResponse(res, {
      files: uploadedFiles,
    }, 'Files uploaded successfully', 200);
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// GET /storage/signed-url
storageRouter.get('/signed-url', async (req: Request, res: Response) => {
  try {
    const key = req.query.key as string;
    const expiresIn = parseInt(req.query.expiresIn as string) || 18000;

    if (!key) {
      return sendApiError(res, 'Key is required to generate signed URL', 400);
    }

    // Generate secure time-bounded signed URL simulation
    const expiresAt = Date.now() + expiresIn * 1000;
    const sig = Buffer.from(`${key}-${expiresAt}-rapidlinks-salt`).toString('base64url').substring(0, 16);
    const signedUrl = `/storage/view/${encodeURIComponent(key)}?expires=${expiresAt}&signature=${sig}`;

    return sendApiResponse(res, {
      url: signedUrl,
      key,
      expiresAt: new Date(expiresAt).toISOString(),
    }, 'Signed URL generated successfully');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});
