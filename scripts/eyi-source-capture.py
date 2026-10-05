"""Read-only, bounded capture of the public EYI reference; never follows forms/login."""
from html.parser import HTMLParser
from urllib.request import Request, urlopen
from urllib.parse import urljoin, urlsplit, urldefrag
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json, hashlib, datetime, subprocess

ORIGIN='https://eyi2026-iibf.mcbu.edu.tr'
OUT=Path('.local/p07-source'); OUT.mkdir(parents=True,exist_ok=True)
class Node:
    def __init__(self,tag='',attrs=()): self.tag=tag; self.attrs=dict(attrs); self.children=[]
    def text(self): return ' '.join(' '.join(c.text() if isinstance(c,Node) else c for c in self.children).split())
    def all(self):
        yield self
        for c in self.children:
            if isinstance(c,Node): yield from c.all()
class Parser(HTMLParser):
    def __init__(self): super().__init__(convert_charrefs=True); self.root=Node(); self.stack=[self.root]
    def handle_starttag(self,t,a):
        n=Node(t,a); self.stack[-1].children.append(n)
        if t not in ['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']: self.stack.append(n)
    def handle_endtag(self,t):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag==t: self.stack=self.stack[:i]; break
    def handle_data(self,d):
        if not any(n.tag in ['script','style'] for n in self.stack): self.stack[-1].children.append(d)
def get(url):
    try:
        r=subprocess.run(['curl','-fsSL','--proto','=https','--proto-redir','=https','--max-time','25','--max-redirs','3','--max-filesize','2097152','-w','\nEYI_CAPTURE:%{url_effective}|%{http_code}',url],capture_output=True)
        if r.returncode: raise ValueError('Verified HTTPS fetch failed: '+str(r.returncode))
        data,meta=r.stdout.rsplit(b'\nEYI_CAPTURE:',1)
        final,status=meta.decode().rsplit('|',1)
        if urlsplit(final).hostname!=urlsplit(ORIGIN).hostname: raise ValueError('Unexpected host redirect')
        parser=Parser(); parser.feed(data.decode('utf-8'))
        return data,parser.root,int(status),final,None
    except Exception as e: return b'',Node(),0,url,str(e)
def links(node,url):
    return [{'label':n.text()[:250],'url':urldefrag(urljoin(url,n.attrs['href']))[0]} for n in node.all() if n.tag=='a' and n.attrs.get('href')]
home,root,_,_,err=get(ORIGIN+'/')
if err: raise RuntimeError(err)
nav=next(n for n in root.all() if n.attrs.get('id')=='navmenu-list')
main=next(n for n in root.all() if n.tag=='main')
targets={x['url']:x['label'] for x in links(nav,ORIGIN)+links(main,ORIGIN) if urlsplit(x['url']).hostname==urlsplit(ORIGIN).hostname and urlsplit(x['url']).path.startswith(('/Sayfa/','/Duyuru/','/Haber/','/Arsiv/','/GeriBildirim','/Iletisim'))}
targets[ORIGIN+'/Iletisim']='Alt bilgi iletişim'; targets[ORIGIN+'/Arsiv/3/101']='Etkinlik arşivi'
if len(targets)>65: raise RuntimeError('Too many source targets')
def capture(pair):
    url,label=pair; data,tree,status,final,error=get(url); name=hashlib.sha256(url.encode()).hexdigest()[:16]
    if data: (OUT/(name+'.html')).write_bytes(data)
    content=next((n for n in tree.all() if 'cms-content' in n.attrs.get('class','').split()),None)
    if content is None: content=next((n for n in tree.all() if n.tag=='main'),Node())
    title=next((n.text() for n in tree.all() if n.tag=='h1'),label)
    parts=[]
    for n in content.all():
        if n.tag=='table':
            rows=[]
            for row in n.all():
                if row.tag=='tr': rows.append([cell.text() for cell in row.children if isinstance(cell,Node) and cell.tag in ['th','td']])
            if rows: parts.append({'tag':'table','rows':rows})
        if n.tag in ['h1','h2','h3','p','li']:
            if n.tag=='p' and any(x.tag in ['p','li','table'] for x in list(n.all())[1:]): continue
            text=n.text()
            if text: parts.append({'tag':n.tag,'text':text})
    return {'url':url,'label':label,'title':title,'status':status,'finalUrl':final,'error':error,'missing':status!=200 or 'bulunamadı' in title.lower(),'sha256':hashlib.sha256(data).hexdigest(),'htmlFile':name+'.html','parts':parts,'links':links(content,url),'images':[{'url':urljoin(url,n.attrs['src']),'alt':n.attrs.get('alt','')} for n in content.all() if n.tag=='img' and n.attrs.get('src')]}
with ThreadPoolExecutor(max_workers=4) as pool: pages=list(pool.map(capture,targets.items()))
manifest={'capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'origin':ORIGIN,'homeSha256':hashlib.sha256(home).hexdigest(),'navigation':links(nav,ORIGIN),'homeLinks':links(main,ORIGIN),'pages':pages}
(OUT/'inventory.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(json.dumps({'pages':len(pages),'missing':[{'label':p['label'],'url':p['url']} for p in pages if p['missing']],'attachments':list({x['url'] for p in pages for x in p['links'] if 'drive.google.com' in x['url'] or x['url'].lower().endswith(('.pdf','.dotx','.docx'))})},ensure_ascii=False,indent=2))
