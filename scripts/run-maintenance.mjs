// Receive a fresh native Sites service credential through hidden stdin only.
// Never use shell arguments, environment exports, files, or browser storage.
const input = await new Promise((resolve, reject) => {
  let text = '';
  const terminal = process.stdin.isTTY;
  const finish = (error) => {
    process.stdin.off('data', onData); process.stdin.off('end', onEnd);
    if (terminal) process.stdin.setRawMode(false);
    process.stdin.pause(); error ? reject(error) : resolve(text);
  };
  const onData = chunk => { text += chunk; if (text.includes('\u0003') || text.length > 65536) finish(new Error('Input cancelled or too large')); else if (/[\r\n]/.test(text)) finish(); };
  const onEnd = () => finish();
  if (terminal) { process.stdin.setRawMode(true); console.error('Ready for service JSON on stdin (input is hidden).'); }
  process.stdin.setEncoding('utf8'); process.stdin.on('data', onData); process.stdin.once('end', onEnd); process.stdin.resume();
});
try {
  const { token, signingKey } = JSON.parse(input);
  if (typeof token !== 'string' || !token || /[\r\n\0]/.test(token)) throw Error('Invalid service credential');
  const endpoint = 'https://khesht-closed-pilot.california-s-1424.chatgpt.site/api/internal/maintenance';
  const signatureHeaders = async method => {
    const headers = { 'OAI-Sites-Authorization': `Bearer ${token}` };
    if (signingKey) {
      if(typeof signingKey !== 'string' || signingKey.length < 32) throw Error('Invalid signing key');
      const {createHmac,randomBytes}=await import('node:crypto');
      const timestamp=Date.now().toString(),nonce=randomBytes(16).toString('hex');
      const message=`${method}\nkhesht-closed-pilot.california-s-1424.chatgpt.site\n/api/internal/maintenance\n${timestamp}\n${nonce}`;
      Object.assign(headers,{'x-khesht-timestamp':timestamp,'x-khesht-nonce':nonce,'x-khesht-signature':createHmac('sha256',signingKey).update(message).digest('hex')});
    }
    return headers;
  };
  const written = await fetch(endpoint, { method: 'POST', headers: await signatureHeaders('POST'), redirect: 'error', signal: AbortSignal.timeout(60000) });
  if (!written.ok) throw Error(`Maintenance write status ${written.status}`);
  const result = await written.json();
  const readback = await fetch(endpoint, { headers: await signatureHeaders('GET'), redirect: 'error', signal: AbortSignal.timeout(30000) });
  if (!readback.ok) throw Error(`Maintenance readback status ${readback.status}`);
  const saved = await readback.json();
  const run = saved.runs?.find(run => run.id === result.id);
  if (!result.result?.verified || run?.state !== 'complete' || run.result?.backupId !== result.result.backupId) throw Error('Maintenance result did not match persisted record');
  console.log(JSON.stringify({ writeStatus: written.status, readStatus: readback.status, id: result.id, verified: true, state: run.state, reused: !!result.reused }));
} catch (error) { console.error(error instanceof Error ? error.message : 'Maintenance failed'); process.exitCode = 1; }
