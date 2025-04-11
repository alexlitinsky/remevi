
import { supabase} from './supabase/client';

/**
 * Uploads a file to Supabase storage
 * @param file The file to upload
 * @param bucket The storage bucket name (defaults to 'study-materials')
 * @returns Object containing the file path and metadata
 */
export async function uploadFileToStorage(
  fileBuffer: Buffer, 
  fileName: string, 
  fileType: string,
  bucket = 'study-materials'
) {
  // Generate a unique file path
  // Generate a unique file path using browser's crypto API
  const fileId = window.crypto.randomUUID();

  const fileExt = fileName.split('.').pop() || '';
  const filePath = `${fileId}.${fileExt}`;

  // Set the auth token for Supabase
  

  // Upload file to Supabase storage
  const { error } = await supabase
    .storage
    .from(bucket)
    .upload(filePath, fileBuffer, {
      contentType: fileType,
      upsert: false
    });
  
  if (error) {
    console.error('Error uploading file to storage:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
  
  // Return file path and metadata
  return {
    filePath,
    fileId,
    metadata: {
      originalName: fileName,
      type: fileType,
      size: fileBuffer.length,
    }
  };
}