import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {PDFDocument} from 'pdf-lib';
import {validateWordTemplate,wordMime} from '../src/modules/cms/word-template.ts';
const source=JSON.parse(readFileSync('.local/p07-source/asset-inventory.json'));mkdirSync('data/eyi-2026/assets',{recursive:true});
for(const asset of source.assets){if(asset.state!=='downloaded')continue;try{
 const original=readFileSync('.local/p07-source/assets/'+asset.file);let content=original;asset.width=null;asset.height=null;
 if(original.subarray(0,5).toString()==='%PDF-'){const pdf=await PDFDocument.load(original,{ignoreEncryption:false,throwOnInvalidObject:true,updateMetadata:false});asset.pages=pdf.getPageCount();if(!asset.pages||asset.pages>200)throw Error('PDF page limit');asset.kind='PDF';asset.mimeType='application/pdf';asset.file+='.pdf';}
 else if(original.subarray(0,2).toString()==='PK'){await validateWordTemplate(original,wordMime.dotx);asset.kind='WORD_TEMPLATE';asset.mimeType=wordMime.dotx;asset.file+='.dotx';}
 else {const image=sharp(original,{limitInputPixels:24000000,animated:false});if(!['png','jpeg','webp'].includes((await image.metadata()).format))throw Error('Image format');const result=await image.rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer({resolveWithObject:true});content=result.data;asset.kind='IMAGE';asset.mimeType='image/webp';asset.width=result.info.width;asset.height=result.info.height;asset.file+='.webp';}
 asset.byteSize=content.length;asset.storedSha256=createHash('sha256').update(content).digest('hex');writeFileSync('data/eyi-2026/assets/'+asset.file,content);asset.state='verified';
}catch(e){asset.state='unavailable';asset.reason=e.message;}}
writeFileSync('data/eyi-2026/assets.json',JSON.stringify(source,null,2)+'\n');console.log(JSON.stringify({verified:source.assets.filter(a=>a.state==='verified').length,unavailable:source.assets.filter(a=>a.state!=='verified').map(a=>({label:a.label,reason:a.reason}))}));
