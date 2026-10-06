import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { CertificateError, validateBounds } from './core.ts';
const fontPaths={SANS:'LiberationSans-Regular.ttf',SERIF:'LiberationSerif-Regular.ttf'};
export async function inspectBackground(bytes) {
  if(!bytes?.length||bytes.length>2*1024*1024||!Buffer.from(bytes.subarray(0,5)).equals(Buffer.from('%PDF-')))throw new CertificateError('Arka plan en fazla 2 MB geçerli PDF olmalı.');
  let doc;try{doc=await PDFDocument.load(bytes,{updateMetadata:false});}catch{throw new CertificateError('PDF açılamadı; şifreli veya bozuk PDF kabul edilmez.');}
  if(doc.getPageCount()!==1)throw new CertificateError('İlk sürüm tek sayfalı PDF arka planı destekler.');
  const page=doc.getPage(0),{width,height}=page.getSize();
  if(page.getRotation().angle!==0)throw new CertificateError('PDF sayfasını dönüş olmadan dışa aktarın.');
  if(width<72||height<72||width>1440||height>1440)throw new CertificateError('PDF sayfa ölçüleri 72–1440 punto arasında olmalı.');
  return {width,height,hash:createHash('sha256').update(bytes).digest('hex')};
}
export function wrapText(text,size,width,measure) {
  const lines=[];for(const paragraph of text.split('\n')){let current='';for(const word of paragraph.split(/\s+/).filter(Boolean)){
    if(measure(word,size)>width){if(current){lines.push(current);current='';}for(const char of Array.from(word)){if(measure(current+char,size)>width&&current){lines.push(current);current='';}if(measure(char,size)>width)throw new CertificateError('Tek bir karakter alan genişliğine sığmıyor.');current+=char;}}
    else if(current&&measure(current+' '+word,size)>width){lines.push(current);current=word;}else current=current?current+' '+word:word;
  }lines.push(current);}return lines;
}
export function fitText(text,slot,measure) {
  const sizes=slot.overflow==='SHRINK'?Array.from({length:Math.ceil((slot.size-slot.minSize)*2)+1},(_,i)=>Math.max(slot.minSize,slot.size-i*0.5)):[slot.size];
  for(const size of sizes){const lines=slot.overflow==='ERROR'?[text]:wrapText(text,size,slot.width,measure);const fits=lines.every(line=>measure(line,size)<=slot.width+0.001)&&(lines.length-1)*size*1.3+size<=slot.height+0.001;
    if(fits)return {size,lines,shrunk:size<slot.size};}
  throw new CertificateError(`${slot.field}: metin alana sığmıyor. Konum/alan/boyut ayarını düzeltin; metin kesilmedi.`,422);
}
export async function renderCertificate({background,layout,data,number,verificationCode,role,createdAt=new Date()}) {
  const info=await inspectBackground(background);validateBounds(layout,info.width,info.height);
  const source=await PDFDocument.load(background,{updateMetadata:false}),doc=await PDFDocument.create();doc.registerFontkit(fontkit);
  // A fresh embedded page keeps the visual background but discards form widgets,
  // annotations, attachments and document-level JavaScript/actions.
  const embedded=await doc.embedPage(source.getPage(0)),page=doc.addPage([info.width,info.height]);page.drawPage(embedded);
  const fonts={};for(const key of new Set(layout.map(s=>s.font)))fonts[key]=await doc.embedFont(await readFile(process.cwd()+'/data/fonts/'+fontPaths[key]),{subset:true});
  const values={...data,number,verificationCode,role},placements=[];
  for(const slot of layout){const text=String(values[slot.field]??'').normalize('NFC');if(!text)continue;const font=fonts[slot.font],characters=new Set(font.getCharacterSet());
    if(Array.from(text.replace(/\s/g,'')).some(c=>!characters.has(c.codePointAt(0))))throw new CertificateError(`${slot.field}: seçilen font bu karakteri desteklemiyor.`,422);
    const placement=fitText(text,slot,(v,s)=>font.widthOfTextAtSize(v,s)),color=[1,3,5].map(i=>parseInt(slot.color.slice(i,i+2),16)/255);
    for(const[i,line]of placement.lines.entries()){const width=font.widthOfTextAtSize(line,placement.size),x=slot.x+(slot.align==='CENTER'?(slot.width-width)/2:slot.align==='RIGHT'?slot.width-width:0);page.drawText(line,{font,size:placement.size,x,y:info.height-slot.y-placement.size-i*placement.size*1.3,color:rgb(...color)});}
    placements.push({field:slot.field,...placement});
  }
  doc.setTitle(data.eventName||'Certificate');doc.setAuthor('Congress platform');doc.setSubject(number);doc.setCreationDate(new Date(createdAt));doc.setModificationDate(new Date(createdAt));
  const pdf=await doc.save();if(pdf.length>5*1024*1024)throw new CertificateError('Üretilen PDF 5 MB sınırını aşıyor.');return {pdf,placements,width:info.width,height:info.height,checksum:createHash('sha256').update(pdf).digest('hex')};
}
export async function sampleBackground(width=841.89,height=595.28) {
  const doc=await PDFDocument.create(),page=doc.addPage([width,height]),font=await doc.embedFont(StandardFonts.Helvetica);
  page.drawRectangle({x:22,y:22,width:width-44,height:height-44,borderWidth:2,borderColor:rgb(.19,.29,.43)});
  page.drawRectangle({x:34,y:34,width:width-68,height:height-68,borderWidth:.5,borderColor:rgb(.69,.57,.33)});
  for(const [text,y,size]of [['SAMPLE CERTIFICATE',height-105,30],['Local demonstration - replace with your approved PDF design',height-132,11]])page.drawText(text,{x:(width-font.widthOfTextAtSize(text,size))/2,y,size,font,color:rgb(.15,.24,.36)});
  return doc.save();
}
