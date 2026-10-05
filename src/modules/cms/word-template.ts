import JSZip from 'jszip';
export const wordMime={docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',dotx:'application/vnd.openxmlformats-officedocument.wordprocessingml.template'};
// Bound the central directory before JSZip allocates decompressed entries.
export async function validateWordTemplate(bytes:Uint8Array,mime:string){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break;}
 if(end<0||view.getUint16(end+4,true)||view.getUint16(end+6,true))throw Error('ZIP directory missing');
 const count=view.getUint16(end+10,true),start=view.getUint32(end+16,true);if(!count||count>300||start>=end)throw Error('ZIP limits');let offset=start,total=0;
 for(let i=0;i<count;i++){
  if(offset+46>end||view.getUint32(offset,true)!==0x02014b50)throw Error('ZIP entry missing');
  const flags=view.getUint16(offset+8,true),compressed=view.getUint32(offset+20,true),size=view.getUint32(offset+24,true),nameSize=view.getUint16(offset+28,true),extra=view.getUint16(offset+30,true),comment=view.getUint16(offset+32,true);
  if(flags&1||size>10*1024*1024||size>Math.max(1024*1024,compressed*100))throw Error('ZIP entry limits');total+=size;if(total>30*1024*1024||offset+46+nameSize+extra+comment>end)throw Error('ZIP total limits');
  const name=new TextDecoder().decode(bytes.subarray(offset+46,offset+46+nameSize));if(name.startsWith('/')||name.includes('..')||name.includes('\\')||/vba|activex|embeddings/i.test(name))throw Error('Unsafe template entry');offset+=46+nameSize+extra+comment;
 }
 const zip=await JSZip.loadAsync(bytes,{checkCRC32:true});const types=await zip.file('[Content_Types].xml')?.async('string');const main=zip.file('word/document.xml');
 const type=mime===wordMime.dotx?'template':'document';if(!types||!main||!types.includes(`application/vnd.openxmlformats-officedocument.wordprocessingml.${type}.main+xml`)||/macroEnabled|vbaProject/i.test(types))throw Error('Word template type mismatch');
 // Never expose attached/embedded code or XML external entities; bytes remain an attachment.
 for(const entry of Object.values(zip.files))if(/\.(xml|rels)$/i.test(entry.name)){
  const xml=await entry.async('string');if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('External template content');for(const relation of xml.match(/<Relationship\b[^>]*>/gi)??[])if(/TargetMode\s*=\s*["']External["']/i.test(relation)&&!/Type\s*=\s*["'][^"']*\/hyperlink["']/i.test(relation))throw Error('External template content');
 }
 return true;
}
