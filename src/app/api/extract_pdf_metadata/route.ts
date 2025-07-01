import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export async function POST(request: NextRequest) {
  try {
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const data = await pdfParse(buffer);
    
    return NextResponse.json({
      pageCount: data.numpages,
      info: data.info,
      metadata: data.metadata
    });
  } catch (error) {
    console.error('Error parsing PDF:', error);
    return NextResponse.json(
      { error: 'Failed to extract PDF metadata' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}; 