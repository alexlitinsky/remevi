import { supabase } from './supabase';
import { randomUUID } from 'crypto';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

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
  const fileId = randomUUID();
  const fileExt = fileName.split('.').pop() || '';
  const filePath = `${fileId}.${fileExt}`;
  
  // Get page count for PDFs
  let pageCount: number | undefined;
  if (fileType.includes('pdf')) {
    try {
      const pdfData = await pdfParse(fileBuffer);
      pageCount = pdfData.numpages;
    } catch (error) {
      console.error('Error counting PDF pages:', error);
    }
  }

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
      pageCount
    }
  };
}

/**
 * Gets a file from Supabase storage
 * @param filePath The path of the file in storage
 * @param bucket The storage bucket name (defaults to 'study-materials')
 * @returns The file data
 */
export async function getFileFromStorage(filePath: string, bucket = 'study-materials') {
  const { data, error } = await supabase
    .storage
    .from(bucket)
    .download(filePath);
  
  if (error) {
    console.error('Error downloading file from storage:', error);
    throw new Error(`Failed to download file: ${error.message}`);
  }
  
  return data;
}

/**
 * Deletes a file from Supabase storage
 * @param filePath The path of the file in storage
 * @param bucket The storage bucket name (defaults to 'study-materials')
 */
export async function deleteFileFromStorage(filePath: string, bucket = 'study-materials') {
  const { error } = await supabase
    .storage
    .from(bucket)
    .remove([filePath]);
  
  if (error) {
    console.error('Error deleting file from storage:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}
