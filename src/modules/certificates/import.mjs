import JSZip from 'jszip';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { createHash } from 'node:crypto';
import { CertificateError, recipientSchema, roles } from './core.ts';
import {recipientIdentity} from './identity.mjs';
const limit=2*1024*1024;
export function readCsv(text) {
  if(Buffer.byteLength(text,'utf8')>limit)throw new CertificateError('Liste en fazla 2 MB olabilir.');
  text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quoted=false,closed=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;}
    else if(c==='"'){if(cell||closed)throw new CertificateError('CSV tırnak biçimi hatalı.');quoted=true;}
    else if(c===','){row.push(cell);cell='';closed=false;}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';closed=false;}
    else {if(closed)throw new CertificateError('CSV kapanan tırnak sonrası ayraç gerekli.');cell+=c;}
    if(cell.length>12000||row.length>32||rows.length>5001)throw new CertificateError('Liste en fazla 5000 veri satırı, 32 sütun ve hücre başına 12000 karakter olabilir.');
  }
  if(quoted)throw new CertificateError('CSV tırnağı kapanmadı.');if(cell||row.length){row.push(cell);rows.push(row);}return table(rows);
}
function table(rows){if(!rows.length||rows[0].length>32||rows.length>5001)throw new CertificateError('Liste başlık satırı ve en fazla 5000 veri satırı içermeli.');const headers=rows[0].map(c=>String(c??'').trim());if(headers.some(h=>!h||h.length>100)||new Set(headers).size!==headers.length)throw new CertificateError('Sütun adları boş veya mükerrer olamaz.');return {headers,rows:rows.slice(1).map((r,i)=>({line:i+2,cells:r.map(c=>String(c??'')),shapeError:r.length>headers.length}))};}
async function xmlFile(zip,path){const file=zip.file(path);if(!file)throw new CertificateError('XLSX zorunlu dosyası eksik.');let size=0;const chunks=[];const data=await new Promise((resolve,reject)=>{const stream=file.internalStream('uint8array');stream.on('data',chunk=>{size+=chunk.length;if(size>limit){stream.pause();reject(new CertificateError('XLSX açılan XML boyutu 2 MB sınırını aşıyor.'));}else chunks.push(chunk);});stream.on('error',()=>reject(new CertificateError('XLSX açılamadı.')));stream.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));stream.resume();});if(/<!DOCTYPE|<!ENTITY/i.test(data)||XMLValidator.validate(data)!==true)throw new CertificateError('XLSX XML yapısı geçersiz.');return new XMLParser({ignoreAttributes:false,removeNSPrefix:true,parseTagValue:false,parseAttributeValue:false,processEntities:true}).parse(data);}
const many=value=>value==null?[]:Array.isArray(value)?value:[value];
function rich(v){if(typeof v==='string')return v;if(v?.['#text']!=null)return String(v['#text']);if(v?.t!=null)return rich(v.t);return many(v?.r).map(r=>rich(r.t)).join('');}
export async function readXlsx(bytes){if(bytes.length>limit||bytes[0]!==80||bytes[1]!==75)throw new CertificateError('Geçerli XLSX gerekli; eski XLS desteklenmez.');let zip;try{zip=await JSZip.loadAsync(bytes,{checkCRC32:false});}catch{throw new CertificateError('XLSX açılamadı.');}
  const names=Object.keys(zip.files);if(names.length>1000||names.some(n=>/vbaProject\.bin$/i.test(n)))throw new CertificateError('Makrolu veya çok büyük XLSX desteklenmez.');
  const workbook=await xmlFile(zip,'xl/workbook.xml'),sheets=many(workbook.workbook?.sheets?.sheet);if(sheets.length!==1)throw new CertificateError('İlk sürüm tek çalışma sayfalı XLSX ister; doğru sayfayı ayrı kaydedin.');
  const rels=await xmlFile(zip,'xl/_rels/workbook.xml.rels'),rel=many(rels.Relationships?.Relationship).find(r=>r['@_Id']===(sheets[0]['@_id']??sheets[0]['@_r:id']));const target=rel?.['@_Target'];if(rel?.['@_TargetMode']==='External'||typeof target!=='string'||!/^\/?(?:xl\/)?worksheets\/sheet[\w-]+\.xml$/.test(target))throw new CertificateError('XLSX çalışma sayfası ilişkisi geçersiz.');const path=target.replace(/^\//,'').startsWith('xl/')?target.replace(/^\//,''):'xl/'+target;
  const shared=zip.file('xl/sharedStrings.xml')?many((await xmlFile(zip,'xl/sharedStrings.xml')).sst?.si).map(rich):[];
  const sheet=await xmlFile(zip,path),xmlRows=many(sheet.worksheet?.sheetData?.row);if(xmlRows.length>5001)throw new CertificateError('XLSX en fazla 5000 veri satırı olabilir.');
  const rows=[];for(const row of xmlRows){const line=Number(row['@_r']);if(!Number.isInteger(line)||line<1||line>5001||rows[line-1])throw new CertificateError('XLSX satır numarası geçersiz veya mükerrer.');const cells=[];for(const c of many(row.c)){const ref=String(c['@_r']??'').match(/^([A-Z]{1,2})(\d+)$/);if(!ref||Number(ref[2])!==line)throw new CertificateError('XLSX hücre adresi geçersiz.');let col=0;for(const ch of ref[1])col=col*26+ch.charCodeAt(0)-64;col--;if(col>=32||cells[col]!==undefined)throw new CertificateError('XLSX en fazla 32 sütun olabilir; mükerrer hücre kabul edilmez.');if(c.f!==undefined||['e','b'].includes(c['@_t']))cells[col]='[UNSUPPORTED_FORMULA_OR_VALUE]';else if(c['@_t']==='s'){const index=Number(c.v);if(!Number.isInteger(index)||index<0||index>=shared.length)throw new CertificateError('XLSX metin ilişkisi geçersiz.');cells[col]=shared[index];}else cells[col]=c['@_t']==='inlineStr'?rich(c.is):String(c.v??'');}rows[line-1]=cells;}
  if(Array.from(rows).some(r=>!r))throw new CertificateError('XLSX içinde boş satır aralığı var; tek sürekli tablo kullanın.');const width=rows[0]?.length??0;return table(rows.map(r=>Array.from({length:Math.max(width,r.length)},(_,i)=>r[i]??'')));
}
export async function readList(bytes,name){if(/\.csv$/i.test(name)){let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new CertificateError('CSV UTF-8 olarak kaydedilmeli.');}return readCsv(text);}if(/\.xlsx$/i.test(name))return readXlsx(bytes);throw new CertificateError('Yalnız UTF-8 CSV veya tek sayfalı XLSX desteklenir.');}
export function mapRows(table,mapping,defaultEvent='',allowedRoleKeys=roles){
  for(const [field,header]of Object.entries(mapping))if(header&&!table.headers.includes(header))throw new CertificateError(`${field}: seçilen sütun bulunamadı.`);
  const seen=new Set(),valid=[],errors=[];for(const row of table.rows){const get=k=>mapping[k]?row.cells[table.headers.indexOf(mapping[k])]??'':'';const data={};for(const k of ['recipientName','title','institution','eventName','datePlace','participation','talkTitle'])data[k]=get(k);if(!data.eventName)data.eventName=defaultEvent;
    const input={email:get('email'),recipientRef:get('recipientRef'),role:get('role'),contextKey:get('contextKey'),data},result=recipientSchema.safeParse(input);const unsupported=row.cells.some(c=>c==='[UNSUPPORTED_FORMULA_OR_VALUE]');
    if(row.shapeError||unsupported||!result.success){errors.push({line:row.line,message:unsupported?'Formül, boolean veya hata hücresi desteklenmez.':row.shapeError?'Fazladan hücre var.':result.error.issues.map(i=>i.path.join('.')+': '+i.message).join('; ')});continue;}
    if(!allowedRoleKeys.includes(result.data.role)){errors.push({line:row.line,message:'Bu kongrede kayıtlı bir belge türü seçin; özel tür kodunu Belgeler ekranından alın.'});continue;}
    const key=JSON.stringify([recipientIdentity(result.data),result.data.role,result.data.contextKey]);if(seen.has(key)){errors.push({line:row.line,message:'Aynı alıcı/görev/bağlam listede tekrar ediyor; aynı adlı farklı kişileri alıcı referansıyla ayırın.'});continue;}seen.add(key);valid.push({line:row.line,...result.data});
  }return {valid,errors,total:table.rows.length,headers:table.headers};
}
export const importHash=(value)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
