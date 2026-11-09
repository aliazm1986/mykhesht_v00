import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),braces=require('braces'),micromatch=require('micromatch');
assert.deepEqual(braces('src/**/*.{ts,tsx}',{expand:true}),['src/**/*.ts','src/**/*.tsx']);
assert.throws(()=>braces('{'.repeat(10000)+'a'+'}'.repeat(10000)),RangeError);
assert.throws(()=>braces.expand('{a,b}'.repeat(25)),RangeError);
assert.throws(()=>braces.expand('{1..1000000}'),RangeError);
assert.equal(micromatch.isMatch('src/app.tsx','**/*.{ts,tsx}'),true);
console.log(JSON.stringify({passed:5,failed:0,patchedDependency:'local MIT bounded-braces fork'}));
