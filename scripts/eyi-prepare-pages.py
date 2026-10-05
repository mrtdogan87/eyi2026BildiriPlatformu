"""Compile a reviewed, read-only EYI capture into typed draft documents.

Run from v2 after source capture and asset preparation. routes.json is the
human-reviewed address mapping; unknown pages stop compilation for review.
This script never contacts the source website or writes a database.
"""
import datetime
import hashlib
import json
from pathlib import Path

source = json.loads(Path('.local/p07-source/inventory.json').read_text())
assets = json.loads(Path('data/eyi-2026/assets.json').read_text())['assets']
routes = json.loads(Path('data/eyi-2026/routes.json').read_text())
by_url = {a['url']: a for a in assets if a['state'] == 'verified'}
months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz',
          'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
captured = datetime.datetime.fromisoformat(source['capturedAt'])
date = f'{captured.day} {months[captured.month-1]} {captured.year}'
warning = (f'Tarihsel arşiv — Bu içerik EYİ 2026 kaynağından {date} tarihinde alınmıştır. '
           'Buradaki tarihler, ücretler, kişiler, iletişim ve yayın vaatleri yeni bir kongrenin bilgileri değildir.')
pages = []
for page in source['pages']:
    if page['url'] not in routes:
        raise ValueError('New source URL requires reviewed route mapping')
    blocks = [{'id': 'archive-warning', 'type': 'notice', 'text': warning}]
    pending = []

    def flush():
        current = ''
        for text in pending:
            if len(text) > 9800:
                raise ValueError('Oversized source paragraph requires editorial review')
            if current and len(current) + len(text) + 2 > 9800:
                blocks.append({'id': f'text-{len(blocks)}', 'type': 'paragraph', 'text': current})
                current = ''
            current = current + '\n\n' + text if current else text
        if current:
            blocks.append({'id': f'text-{len(blocks)}', 'type': 'paragraph', 'text': current})
        pending.clear()

    for part in page['parts']:
        if part['tag'] in ('h1', 'h2', 'h3'):
            flush()
            blocks.append({'id': f'heading-{len(blocks)}', 'type': 'heading',
                           'level': 3 if part['tag'] == 'h3' else 2, 'text': part['text']})
        elif part['tag'] == 'table':
            flush()
            rows = part['rows']
            columns = max(len(row) for row in rows)
            headers = (rows[0] + [''] * columns)[:columns]
            headers = [text or f'Sütun {index+1}' for index, text in enumerate(headers)]
            blocks.append({'id': f'table-{len(blocks)}', 'type': 'table',
                           'caption': page['title'] + ' — kaynak tablosu', 'headers': headers,
                           'rows': [(row + [''] * columns)[:columns] for row in rows[1:]]})
        else:
            pending.append(part['text'])
    flush()
    files = []
    for item in page['images'] + page['links']:
        asset = by_url.get(item['url'])
        if not asset or asset['file'] in files:
            continue
        files.append(asset['file'])
        block = {'id': f'asset-{len(blocks)}', 'type': 'image' if asset['kind'] == 'IMAGE' else 'download',
                 'mediaId': 'asset-' + asset['file']}
        if asset['kind'] == 'IMAGE':
            block.update(alt=item.get('alt') or page['title'] + ' — kaynak görseli',
                         caption=page['title'] + ' — EYİ 2026')
        else:
            block['label'] = item.get('label') or asset['label'] or page['title']
        blocks.append(block)
    blocks.append({'id': 'official-source', 'type': 'button', 'label': 'Resmî EYİ 2026 kaynağı',
                   'target': 'EXTERNAL', 'pageSlug': '', 'url': page['url']})
    if len(blocks) > 40:
        raise ValueError('Source page exceeds CMS block limit; review required')
    document = {'version': 1, 'showInMenu': False, 'menuParent': '', 'menuOrder': 10,
                'translations': {'tr': {'enabled': True, 'title': page['title'], 'menuLabel': '',
                                        'lead': 'EYİ 2026 tarihsel referansı; yeni kongre başlangıç içeriğinden ayrıdır.',
                                        'blocks': blocks},
                                 'en': {'enabled': False, 'title': '', 'menuLabel': '', 'lead': '', 'blocks': []}}}
    pages.append({'key': hashlib.sha256(page['url'].encode()).hexdigest()[:16],
                  'slug': routes[page['url']], 'url': page['url'], 'title': page['title'],
                  'status': page['status'], 'state': 'missing' if page['missing'] else 'ready',
                  'sourceSha256': page['sha256'], 'sourceParts': len(page['parts']),
                  'sourceLinks': page['links'], 'assetFiles': files, 'document': document})
result = {key: source[key] for key in ('capturedAt', 'origin', 'homeSha256')}
result['pages'] = pages
text_items = 0
table_cells = 0
for original, compiled in zip(source['pages'], pages):
    body = '\n'.join(block.get('text', '') for block in compiled['document']['translations']['tr']['blocks'])
    serialized = json.dumps(compiled['document'], ensure_ascii=False)
    for part in original['parts']:
        if part.get('text'):
            assert part['text'] in body, 'Captured text must remain intact'
            text_items += 1
        for row in part.get('rows', []):
            for cell in row:
                assert json.dumps(cell, ensure_ascii=False) in serialized, 'Captured table cell must be retained'
                table_cells += 1
Path('data/eyi-2026/pages.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
report = {'pages': len(pages), 'ready': sum(p['state'] == 'ready' for p in pages),
          'textItemsRetained': text_items, 'tableCellsRetained': table_cells}
Path('.local/p07-source/review').mkdir(exist_ok=True)
Path('.local/p07-source/review/source-comparison.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report))
