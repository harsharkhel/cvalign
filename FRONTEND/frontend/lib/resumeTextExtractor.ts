/** Extract plain text from resume files before sending to Supabase Edge Function. */

export async function extractResumeText(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.txt')) {
    const text = await file.text();
    if (text.trim().length >= 50) return text.trim();
    throw new Error('Resume text file is too short.');
  }

  if (name.endsWith('.pdf')) {
    const pdfjs = await import('pdfjs-dist');
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    const parts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      parts.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
    }
    const text = parts.join('\n').replace(/\s+/g, ' ').trim();
    if (text.length >= 50) return text;
    throw new Error('Could not extract enough text from PDF.');
  }

  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    const text = (result.value || '').replace(/\s+/g, ' ').trim();
    if (text.length >= 50) return text;
    throw new Error('Could not extract enough text from DOCX.');
  }

  throw new Error('Only PDF, DOCX, and TXT files are supported.');
}
