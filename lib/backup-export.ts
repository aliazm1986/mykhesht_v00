// POSIX ustar export. Files remain private and are streamed one at a time.
type BackupFile = { documentId: string; backupKey: string; checksum: string };
const encode = new TextEncoder();
function header(name: string, size: number, timestamp: number) {
  if (!/^[a-zA-Z0-9._/-]+$/.test(name) || name.length > 100 || name.includes('..') || !Number.isSafeInteger(size) || size < 0 || size > 0o77777777777) throw Error('Invalid archive entry');
  const block = new Uint8Array(512);
  const write = (at: number, value: string) => block.set(encode.encode(value), at);
  write(0, name); write(100, '0000600\0'); write(108, '0000000\0'); write(116, '0000000\0');
  write(124, size.toString(8).padStart(11, '0') + '\0'); write(136, Math.floor(timestamp / 1000).toString(8).padStart(11, '0') + '\0');
  write(148, '        '); write(156, '0'); write(257, 'ustar\0'); write(263, '00');
  const sum = block.reduce((a, b) => a + b, 0); write(148, sum.toString(8).padStart(6, '0') + '\0 ');
  return block;
}
export function backupArchive(bucket: R2Bucket, manifest: Uint8Array, files: BackupFile[], createdAt: number) {
  async function* entries() {
    yield header('manifest.json', manifest.byteLength, createdAt); yield manifest;
    if (manifest.byteLength % 512) yield new Uint8Array(512 - manifest.byteLength % 512);
    for (const file of files) {
      if (!/^[a-zA-Z0-9-]+$/.test(file.documentId)) throw Error('Invalid document id');
      const object = await bucket.get(file.backupKey); if (!object) throw Error('Backup file unavailable');
      const bytes = new Uint8Array(await object.arrayBuffer());
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
      if (hash !== file.checksum) throw Error('Backup checksum mismatch');
      yield header(`files/${file.documentId}.bin`, bytes.byteLength, createdAt); yield bytes;
      if (bytes.byteLength % 512) yield new Uint8Array(512 - bytes.byteLength % 512);
    }
    yield new Uint8Array(1024);
  }
  const iterator = entries();
  return new ReadableStream<Uint8Array>({ async pull(controller) { try { const item = await iterator.next(); if (item.done) controller.close(); else controller.enqueue(item.value); } catch (error) { controller.error(error); } }, async cancel() { await iterator.return(undefined); } });
}
