import { IncomingForm } from 'formidable';
import { promises as fs } from 'fs';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new IncomingForm({ maxFileSize: 25 * 1024 * 1024 });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parse error:', err);
      return res.status(400).json({ error: 'Upload failed' });
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file?.filepath) return res.status(400).json({ error: 'No file uploaded' });

    const buffer = await fs.readFile(file.filepath);
    const data = await pdfParse(buffer);

    return res.status(200).json({
      pageCount: data.numpages,
      metadata: {
        title: typeof data.info === 'object' && data.info !== null ?
          (data.info as Record<string, unknown>).Title as string | undefined : undefined,
        author: typeof data.info === 'object' && data.info !== null ?
          (data.info as Record<string, unknown>).Author as string | undefined : undefined
      },
    });
  });
}