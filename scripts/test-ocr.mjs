import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { createWorker } from 'tesseract.js';
import path from 'node:path';
import './prepare-ocr.mjs';
const canvas = createCanvas(1400, 220), context = canvas.getContext('2d');
context.fillStyle = '#fff'; context.fillRect(0, 0, 1400, 220);
context.fillStyle = '#000'; context.font = '60px sans-serif';
context.fillText('KHESHT BUILDING PROJECT 2026', 35, 125);
const worker = await createWorker('fas+eng', 1, { langPath: path.resolve('public/ocr/lang'), cacheMethod: 'none' });
try {
  const { data } = await worker.recognize(canvas.toBuffer('image/png'));
  assert.match(data.text, /KHESHT/); assert.match(data.text, /2026/); assert.ok(data.confidence >= 35);
  console.log(JSON.stringify({ passed: 3, languagesLoaded: ['fas', 'eng'], confidence: Math.round(data.confidence), engine: 'real Tesseract Node worker', browserInteractionTested: false }));
} finally { await worker.terminate(); }
