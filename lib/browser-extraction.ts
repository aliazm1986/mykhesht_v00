import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
import { withExtractionTimeout } from './extraction-timeout';

type Progress = (message: string) => void;
type PageEvidence = { page: number; method: 'pdf_text' | 'ocr'; confidence?: number };
export async function extractDocumentText(file: File, progress: Progress) {
  const pages: string[] = [];
  const evidence: PageEvidence[] = [];
  let worker: Awaited<ReturnType<typeof import('tesseract.js').createWorker>> | undefined;
  let characters = 0;
  async function recognize(canvas: HTMLCanvasElement, page: number) {
    if (!worker) {
      progress('آماده‌سازی تشخیص متن فارسی و انگلیسی روی دستگاه شما…');
      const { createWorker } = await import('tesseract.js');
      const pending = createWorker('fas+eng', 1, {
        workerPath: '/ocr/worker.min.js',
        corePath: '/ocr/core',
        langPath: '/ocr/lang',
        cacheMethod: 'none',
        workerBlobURL: false,
        logger: (event) => {
          const steps: Record<string, string> = {
            'loading tesseract core': 'بارگذاری موتور OCR',
            'loading language traineddata': 'بارگذاری مدل زبان',
            'initializing tesseract': 'راه‌اندازی موتور OCR',
            'recognizing text': 'تشخیص متن',
          };
          if (steps[event.status]) progress(`${steps[event.status]}… ${Math.round((event.progress || 0) * 100).toLocaleString('fa-IR')}٪`);
        },
      });
      let timedOut = false;
      void pending.then(async (ready) => { if (timedOut) await ready.terminate(); }).catch(() => undefined);
      try {
        worker = await withExtractionTimeout(
          pending,
          90_000,
          'آماده‌سازی OCR بیش از ۹۰ ثانیه طول کشید؛ فایل خام ثبت می‌شود و می‌توانید متن را دستی وارد کنید.',
        );
      } catch (error) {
        timedOut = true;
        throw error;
      }
    }
    progress(`تشخیص متن صفحهٔ ${page.toLocaleString('fa-IR')} روی دستگاه شما…`);
    const result = await withExtractionTimeout(
      worker.recognize(canvas),
      90_000,
      'تشخیص متن در زمان مجاز کامل نشد؛ فایل خام را ثبت و متن را دستی تکمیل کنید.',
    );
    const text = result.data.text.trim();
    if (text.length < 2 || result.data.confidence < 35) {
      throw new Error(`کیفیت تشخیص صفحهٔ ${page.toLocaleString('fa-IR')} کافی نیست؛ تصویر واضح‌تر یا متن دستی لازم است.`);
    }
    evidence.push({ page, method: 'ocr', confidence: Math.round(result.data.confidence) });
    return text;
  }
  function append(text: string) {
    characters += text.length + 2;
    if (characters > 120_000) throw new Error('متن بیش از ۱۲۰٬۰۰۰ نویسه است؛ سند را تقسیم کنید.');
    pages.push(text);
  }
  try {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      try {
        if (pdf.numPages > 500) throw new Error('PDF بیش از ۵۰۰ صفحه است؛ سند را تقسیم کنید.');
        let ocrPages = 0;
        for (let index = 1; index <= pdf.numPages; index++) {
          progress(`خواندن صفحهٔ ${index.toLocaleString('fa-IR')} از ${pdf.numPages.toLocaleString('fa-IR')}…`);
          const page = await pdf.getPage(index);
          try {
            const content = await page.getTextContent();
            let text = content.items.map((item) => ('str' in item ? item.str : '')).join(' ').trim();
            if (!text) {
              if (++ocrPages > 20) throw new Error('برای پردازش OCR، سند را به بخش‌های حداکثر ۲۰ صفحهٔ اسکن‌شده تقسیم کنید.');
              const base = page.getViewport({ scale: 1 });
              const scale = Math.min(2, 1800 / Math.max(base.width, base.height));
              const viewport = page.getViewport({ scale });
              const canvas = document.createElement('canvas');
              canvas.width = Math.ceil(viewport.width);
              canvas.height = Math.ceil(viewport.height);
              try {
                await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise;
                text = await recognize(canvas, index);
              } finally {
                canvas.width = 0;
                canvas.height = 0;
              }
            } else evidence.push({ page: index, method: 'pdf_text' });
            append(text);
          } finally {
            page.cleanup();
          }
        }
      } finally {
        await pdf.destroy();
      }
    } else if (/image\/(?:png|jpeg|webp)/.test(file.type) || /\.(?:png|jpe?g|webp)$/i.test(file.name)) {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      try {
        if (bitmap.width * bitmap.height > 40_000_000) throw new Error('تصویر بیش از ۴۰ مگاپیکسل است؛ نسخهٔ کوچک‌تری انتخاب کنید.');
        const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const context = canvas.getContext('2d')!;
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        append(await recognize(canvas, 1));
      } finally {
        bitmap.close();
        canvas.width = 0;
        canvas.height = 0;
      }
    } else return null;
    return {
      text: pages.join('\n\n'),
      pageCount: pages.length,
      sourceKind: evidence.some((p) => p.method === 'ocr') ? 'browser_ocr' : 'browser_pdfjs',
      evidence,
    };
  } finally {
    if (worker) await worker.terminate();
  }
}
