"""Download only public attachments discovered in the frozen EYI inventory."""
import json,hashlib,re,subprocess,datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlsplit
root=Path('.local/p07-source'); inventory=json.loads((root/'inventory.json').read_text());out=root/'assets';out.mkdir(exist_ok=True)
sources={}
for p in inventory['pages']:
 for a in p['links']+p['images']:
  url=a['url'];host=urlsplit(url).hostname
  if host=='drive.google.com' and '/file/d/' in url or host=='eyi2026-iibf.mcbu.edu.tr' and re.search(r'\.(pdf|png|jpe?g|webp)$',url,re.I): sources.setdefault(url,a.get('label') or a.get('alt') or p['title'])
for a in inventory['homeLinks']:
 if a['url'].lower().endswith('.pdf'):sources.setdefault(a['url'],a['label'])
if len(sources)>80:raise RuntimeError('Asset target limit exceeded')
def get(pair):
 url,label=pair;download=url
 if 'drive.google.com' in url:
  match=re.search('/file/d/([A-Za-z0-9_-]+)',url)
  if not match:raise RuntimeError('Drive id missing')
  download='https://drive.google.com/uc?export=download&id='+match.group(1)
 name=hashlib.sha256(url.encode()).hexdigest()[:20];path=out/name
 result=subprocess.run(['curl','-fSL','--proto','=https','--proto-redir','=https','--max-time','40','--max-redirs','5','--max-filesize','8388608','-o',str(path),'-w','%{http_code}|%{content_type}|%{url_effective}',download],capture_output=True)
 meta=result.stdout.decode().split('|',2);record={'url':url,'label':label,'status':int(meta[0]) if meta and meta[0].isdigit() else 0,'mime':meta[1] if len(meta)>1 else '', 'downloadUrl':download,'file':name,'state':'downloaded' if not result.returncode else 'unavailable','reason':None if not result.returncode else 'HTTPS download failed or exceeded 8 MB (curl '+str(result.returncode)+')'}
 if path.exists():
  data=path.read_bytes()
  if data[:5]!=b'%PDF-' and data[:2]!=b'PK' and not data.startswith((b'\x89PNG',b'\xff\xd8',b'RIFF')):record.update(state='unavailable',reason='Expected attachment, received another content type')
  if record['state']=='downloaded':record.update(byteSize=len(data),sha256=hashlib.sha256(data).hexdigest())
  else:path.unlink()
 return record
with ThreadPoolExecutor(max_workers=4) as pool:assets=list(pool.map(get,sources.items()))
(root/'asset-inventory.json').write_text(json.dumps({'capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'assets':assets},ensure_ascii=False,indent=2))
print(json.dumps({'assets':len(assets),'downloaded':sum(a['state']=='downloaded' for a in assets),'unavailable':[{k:a[k] for k in ['label','url','reason']} for a in assets if a['state']!='downloaded']},ensure_ascii=False,indent=2))
