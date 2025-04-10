import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import type { ReadableStream } from 'stream/web';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

interface PdfMetadataResult {
  pageCount: number;
  metadata?: {
    title?: string;
    author?: string;
  };
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PARSING_TIME = 3000; // 3 seconds

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    
    if (contentLength > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `PDF exceeds size limit of ${MAX_FILE_SIZE/1024/1024}MB` },
        { status: 413 }
      );
    }

    const webStream = request.body as unknown as ReadableStream;
    const readable = Readable.fromWeb(webStream);
    
    let buffer = Buffer.alloc(0);
    let totalSize = 0;

    for await (const chunk of readable) {
      const chunkBuffer = Buffer.from(chunk);
      totalSize += chunkBuffer.length;
      buffer = Buffer.concat([buffer, chunkBuffer]);
      
      if (totalSize > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `PDF exceeded size limit during streaming` },
          { status: 413 }
        );
      }
    }

    // Parse without type assertion first
    const data = await pdfParse(buffer);
    
    // Safely extract metadata
    const result: PdfMetadataResult = {
      pageCount: data.numpages,
      metadata: {
        title: typeof data.info === 'object' && data.info !== null ? 
          (data.info as Record<string, unknown>).Title as string | undefined : undefined,
        author: typeof data.info === 'object' && data.info !== null ? 
          (data.info as Record<string, unknown>).Author as string | undefined : undefined
      }
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('PDF processing error:', error);
    return NextResponse.json(
      { 
        error: 'Cannot process PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};