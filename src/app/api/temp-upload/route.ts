import { NextRequest } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { mkdir } from 'fs/promises';

const TEMP_DIR = join(process.cwd(), 'tmp', 'uploads');

export async function POST(request: NextRequest) {
  try {
    // Ensure temp directory exists
    await mkdir(TEMP_DIR, { recursive: true });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return new Response('No file uploaded', { status: 400 });
    }

    // Generate unique ID for this upload
    const uploadId = randomUUID();
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Save file to temp location
    const filePath = join(TEMP_DIR, uploadId);
    await writeFile(filePath, buffer);

    // Store metadata
    const metadata = {
      originalName: file.name,
      type: file.type,
      size: file.size,
    };
    await writeFile(`${filePath}.json`, JSON.stringify(metadata));

    return Response.json({ uploadId });
  } catch (error) {
    console.error('Error handling upload:', error);
    return new Response('Error processing upload', { status: 500 });
  }
} 