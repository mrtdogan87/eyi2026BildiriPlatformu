import {createHash} from 'node:crypto';
export function canonical(v){if(Array.isArray(v))return v.map(canonical);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));return v;}
export function fingerprint(v){return createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');}
