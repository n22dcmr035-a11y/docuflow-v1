import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await mammoth.convertToHtml({ buffer });

    return NextResponse.json({ html: result.value, messages: result.messages });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Parsing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
