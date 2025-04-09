import { NextRequest } from 'next/server';
import { uploadFileToStorage } from '@/lib/storage';
import { currentUser } from '@clerk/nextjs/server';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await rateLimit(user.id);
    if (rateLimitResult.error) {
      return rateLimitResult.error;
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return new Response('No file uploaded', { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Upload to Supabase storage
    const { filePath, fileId, metadata } = await uploadFileToStorage(
      buffer,
      file.name,
      file.type
    );

    // Return file ID for later retrieval
    return Response.json({ 
      uploadId: fileId,
      filePath,
      metadata
    });
  } catch (error) {
    console.error('Error handling upload:', error);
    return new Response('Error processing upload', { status: 500 });
  }
}