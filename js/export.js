/* GDD Creator — Çıktı üreticileri
 * Markdown, HTML (tek dosya), PDF (yazdırma), JSON, düz metin, CSV backlog.
 */
(function () {
'use strict';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Türkçe doğru büyük harf: i→İ, ı→I */
function upperTR(s) {
  return String(s).replace(/i/g, 'İ').replace(/ı/g, 'I').toLocaleUpperCase('tr-TR');
}

/* Kapakta zaten gösterilen alanlar gövdede tekrar edilmez. */
const COVER_FIELDS = { identity: ['title', 'tagline', 'version', 'authors'] };
function isCoverField(sec, q) {
  const list = COVER_FIELDS[sec.id];
  return !!(list && list.indexOf(q.id) >= 0);
}

function answerLabel(project, sec, q) { return window.Store.getAnswer(project, sec.id, q.id); }

/* Bir cevabı, verilen "biçimleyici" ile metne çevirir.
 * Elle düzenlenmiş / eski sürümden gelen bozuk veriye karşı savunmacıdır:
 * beklenen şekilde olmayan değer, veriyi atmak yerine metne düşürülür. */
function renderValue(v, q, fmt) {
  if (window.isEmptyVal(v)) return null;
  const arr = x => Array.isArray(x) ? x : [x];
  try {
    switch (q.type) {
      case 'multi':
      case 'list':
        return fmt.list(arr(v).map(x => String(x)).filter(x => x.trim()));
      case 'tags':
        return fmt.inline(arr(v).map(x => String(x)).filter(x => x.trim()).join(', '));
      case 'table': {
        if (!Array.isArray(v)) return fmt.para(String(v));          // tablo beklerken düz metin
        const rows = v.map(r => Array.isArray(r) ? r : [r])          // satır dizi değilse sar
                      .filter(r => r.some(c => c != null && String(c).trim()));
        if (!rows.length) return null;
        return fmt.table(q.cols || [], rows);
      }
      case 'scale':
        return fmt.inline(String(v) + ' / 5');
      default:
        return fmt.para(Array.isArray(v) ? v.join(', ') : String(v)); // metin beklerken dizi
    }
  } catch (e) {
    console.warn('Cevap işlenemedi, düz metne düşürüldü:', q.id, e);
    try { return fmt.para(typeof v === 'string' ? v : JSON.stringify(v)); } catch (e2) { return null; }
  }
}

/* Dokümanda gerçekten gövdesi olacak bölümleri döndürür.
 * İçindekiler ile gövde arasındaki tutarsızlığı bu tek kaynak engeller. */
function renderableSections(project, fmt, opts) {
  const out = [];
  project.sections.forEach(s => {
    if (!s.enabled) return;
    const parts = [];
    s.questions.forEach(q => {
      if (isCoverField(s, q)) return;
      const v = answerLabel(project, s, q);
      const r = renderValue(v, q, fmt);
      if (r === null) {
        if (opts && opts.includeEmpty) parts.push({ q, body: null });
        return;
      }
      parts.push({ q, body: r });
    });
    if (!parts.length) return;
    out.push({ sec: s, parts });
  });
  return out;
}

/* ---------------- MARKDOWN ---------------- */
const MD_FMT = {
  para: t => t.split('\n').map(l => l.trimEnd()).join('\n'),
  inline: t => t,
  list: arr => arr.map(x => '- ' + String(x).replace(/\n/g, ' ')).join('\n'),
  table: (cols, rows) => {
    const w = Math.max(cols.length, ...rows.map(r => r.length));
    const head = cols.length ? cols : Array.from({ length: w }, (_, i) => 'Sütun ' + (i + 1));
    const pad = r => { const a = r.slice(0, w); while (a.length < w) a.push(''); return a; };
    const cell = c => String(c == null ? '' : c).replace(/\|/g, '\\|').replace(/\n/g, ' ');
    let out = '| ' + pad(head).map(cell).join(' | ') + ' |\n';
    out += '|' + pad(head).map(() => '---').join('|') + '|\n';
    rows.forEach(r => { out += '| ' + pad(r).map(cell).join(' | ') + ' |\n'; });
    return out.trimEnd();
  }
};

function toMarkdown(project, opts) {
  opts = opts || {};
  const title = getTitle(project);
  let md = '# ' + title + '\n\n';

  const tl = findAnswer(project, 'identity', 'tagline');
  if (tl) md += '> ' + String(tl).replace(/\n/g, ' ') + '\n\n';
  md += coverMeta(project).map(m => '**' + m[0] + ':** ' + m[1]).join(' · ') + '\n\n';

  const blocks = renderableSections(project, MD_FMT, opts);

  if (opts.toc !== false && blocks.length > 2) {
    md += '## İçindekiler\n\n';
    blocks.forEach((b, i) => { md += (i + 1) + '. [' + b.sec.title + '](#' + slug(b.sec.title) + ')\n'; });
    md += '\n---\n\n';
  }

  blocks.forEach(b => {
    md += '## ' + b.sec.title + '\n\n';
    if (b.sec.desc && opts.includeDesc) md += '_' + b.sec.desc + '_\n\n';
    b.parts.forEach(p => {
      md += '### ' + p.q.label + '\n\n' + (p.body === null ? '_(doldurulmadı)_' : p.body) + '\n\n';
    });
  });

  md += '---\n\n_GDD Creator ile oluşturuldu._\n';
  return md;
}

/* ---------------- DÜZ METİN ---------------- */
const TXT_FMT = {
  para: t => t,
  inline: t => t,
  list: arr => arr.map(x => '  * ' + x).join('\n'),
  table: (cols, rows) => {
    const w = Math.max(cols.length, ...rows.map(r => r.length));
    const head = cols.length ? cols : Array.from({ length: w }, (_, i) => 'Sütun ' + (i + 1));
    const all = [head].concat(rows.map(r => { const a = r.slice(0, w); while (a.length < w) a.push(''); return a; }));
    const widths = [];
    for (let c = 0; c < w; c++) widths[c] = Math.max.apply(null, all.map(r => String(r[c] || '').length));
    const line = r => '  ' + r.map((c, i) => String(c || '').padEnd(widths[i])).join('  |  ');
    const sep = '  ' + widths.map(x => '-'.repeat(x)).join('--+--');
    return [line(head), sep].concat(all.slice(1).map(line)).join('\n');
  }
};

function toText(project) {
  const title = upperTR(getTitle(project));
  let t = title + '\n' + '='.repeat(title.length) + '\n\n';
  const tl = findAnswer(project, 'identity', 'tagline');
  if (tl) t += tl + '\n\n';
  t += coverMeta(project).map(m => m[0] + ': ' + m[1]).join('   ') + '\n';

  renderableSections(project, TXT_FMT, {}).forEach(b => {
    const st = upperTR(b.sec.title);
    t += '\n\n' + st + '\n' + '-'.repeat(st.length) + '\n\n';
    b.parts.forEach(p => {
      const ql = upperTR(p.q.label);
      t += '  ' + ql + '\n  ' + '-'.repeat(ql.length) + '\n' + indent(p.body) + '\n\n';
    });
  });
  return t;
}
function indent(s) { return String(s).split('\n').map(l => (l.startsWith('  ') ? l : '  ' + l)).join('\n'); }

/* ---------------- HTML ---------------- */
const HTML_FMT = {
  para: t => '<p>' + esc(t) + '</p>',
  inline: t => '<p>' + esc(t) + '</p>',
  list: arr => '<ul>' + arr.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>',
  table: (cols, rows) => {
    const w = Math.max(cols.length, ...rows.map(r => r.length));
    const head = cols.length ? cols : Array.from({ length: w }, (_, i) => 'Sütun ' + (i + 1));
    let h = '<table><thead><tr>' + head.map(c => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>';
    rows.forEach(r => {
      const a = r.slice(0, w); while (a.length < w) a.push('');
      h += '<tr>' + a.map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>';
    });
    return h + '</tbody></table>';
  }
};

/* Kapak üstbilgisi: [etiket, değer] çiftleri */
function coverMeta(project) {
  const m = [];
  const g = (window.SCHEMA.GENRES[project.genre] || {}).label;
  if (g) m.push(['Tür', g]);
  const ver = findAnswer(project, 'identity', 'version');
  if (ver) m.push(['Sürüm', ver]);
  const au = findAnswer(project, 'identity', 'authors');
  if (au) m.push(['Hazırlayan', Array.isArray(au) ? au.join(', ') : au]);
  m.push(['Güncelleme', new Date(project.updatedAt).toLocaleDateString('tr-TR')]);
  return m;
}

function docBody(project, opts) {
  opts = opts || {};
  const title = getTitle(project);
  let h = '<h1>' + esc(title) + '</h1>';
  h += '<div class="subtitle">' + coverMeta(project).map(m => esc(m[0]) + ': ' + esc(m[1])).join('&nbsp; · &nbsp;') + '</div>';
  const tl = findAnswer(project, 'identity', 'tagline');
  if (tl) h += '<p class="logline"><em>' + esc(tl) + '</em></p>';

  const blocks = renderableSections(project, HTML_FMT, opts);
  if (!blocks.length) {
    return h + '<p class="missing">Henüz içerik yok — soruları doldurdukça doküman burada oluşur.</p>';
  }

  if (opts.toc && blocks.length > 2) {
    h += '<div class="toc"><div class="toc-h">İçindekiler</div><ol>' +
      blocks.map(b => '<li><a href="#' + slug(b.sec.title) + '">' + esc(b.sec.title) + '</a></li>').join('') +
      '</ol></div>';
  }

  blocks.forEach(b => {
    h += '<h2 id="' + slug(b.sec.title) + '">' + esc(b.sec.title) + '</h2>';
    b.parts.forEach(p => {
      h += '<h3>' + esc(p.q.label) + '</h3>' + (p.body === null ? '<p class="missing">(doldurulmadı)</p>' : p.body);
    });
  });
  return h;
}

/* Uygulama içi canlı önizleme */
function toDocHTML(project, opts) { return docBody(project, opts || {}); }

/* Paylaşılabilir tek dosya HTML */
function toStandaloneHTML(project, opts) {
  const title = getTitle(project);
  const body = docBody(project, Object.assign({ toc: true }, opts || {}));
  return '<!DOCTYPE html>\n<html lang="tr">\n<head>\n<meta charset="utf-8">\n' +
'<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
'<title>' + esc(title) + ' — GDD</title>\n<style>\n' +
`  :root{--bg:#0d0d0d;--fg:#d8d8d8;--fgd:#8a8a8a;--line:#2a2a2a;--acc:#ff2d2d;--panel:#151515}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.7 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  .page{max-width:820px;margin:0 auto;padding:44px 22px 90px}
  h1{font-size:30px;margin:0 0 8px;color:#fff;border-bottom:1px solid var(--line);padding-bottom:12px;letter-spacing:-.02em}
  h2{font-size:15px;margin:38px 0 10px;color:#fff;text-transform:uppercase;letter-spacing:.08em;
     font-family:ui-monospace,monospace;border-left:2px solid var(--acc);padding-left:10px}
  h3{font-size:13.5px;margin:20px 0 4px;color:#fff;font-weight:600}
  p{margin:0 0 10px;white-space:pre-wrap}
  ul{margin:0 0 12px;padding-left:20px} li{margin-bottom:3px}
  table{border-collapse:collapse;width:100%;margin:6px 0 14px;font-size:13px}
  th,td{border:1px solid var(--line);padding:6px 9px;text-align:left;vertical-align:top}
  th{background:var(--panel);font-family:ui-monospace,monospace;font-size:10.5px;text-transform:uppercase;
     letter-spacing:.07em;color:var(--fgd);font-weight:500}
  .subtitle{font-family:ui-monospace,monospace;font-size:11.5px;color:var(--fgd);margin-bottom:16px;letter-spacing:.03em}
  .logline{font-size:15px;color:#bdbdbd;border-left:2px solid var(--line);padding-left:12px;margin-bottom:26px}
  .toc{border:1px solid var(--line);padding:14px 18px;margin-bottom:10px;background:#101010}
  .toc-h{font-family:ui-monospace,monospace;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--fgd);margin-bottom:8px}
  .toc ol{margin:0;padding-left:20px;columns:2;column-gap:26px}
  .toc li{margin-bottom:3px;font-size:13px}
  .toc a{color:var(--fg);text-decoration:none}
  .toc a:hover{color:var(--acc)}
  .missing{color:#5a5a5a;font-style:italic}
  .foot{margin-top:54px;padding-top:14px;border-top:1px solid var(--line);
        font-family:ui-monospace,monospace;font-size:10.5px;color:#5a5a5a;letter-spacing:.06em}
  @media print{
    body{background:#fff;color:#000}
    h1,h2,h3{color:#000} h2{border-left-color:#c00;page-break-after:avoid}
    th{background:#eee;color:#000} th,td{border-color:#999}
    .subtitle,.foot{color:#555} .logline{color:#333;border-left-color:#999}
    .toc{background:#fff;border-color:#999;page-break-after:always} .toc a{color:#000}
    table,ul{page-break-inside:avoid}
    .page{max-width:none;padding:0}
    @page{margin:18mm 16mm}
  }
</style>\n</head>\n<body><div class="page">\n` +
body + '\n<div class="foot">GDD CREATOR · ' + esc(new Date(project.updatedAt).toLocaleString('tr-TR')) +
'</div>\n</div></body></html>';
}

/* ---------------- CSV BACKLOG ---------------- */
function toBacklogCSV(project) {
  const rows = [['Bölüm', 'Görev', 'Tip', 'Öncelik', 'Durum']];
  project.sections.forEach(s => {
    if (!s.enabled) return;
    s.questions.forEach(q => {
      const v = answerLabel(project, s, q);
      if (window.isEmptyVal(v)) {
        if (q.required) rows.push([s.title, q.label + ' — karar ver ve yaz', 'Doküman', 'Yüksek', 'Açık']);
        else rows.push([s.title, q.label + ' — karar ver ve yaz', 'Doküman', 'Düşük', 'Açık']);
        return;
      }
      if (q.type === 'table' && /sistem|milestone|kilometre|asset|özellik|birim|silah|patron|yetenek|seviye|oda/i.test(q.label)) {
        v.forEach(r => {
          if (!r.some(c => c && String(c).trim())) return;
          const name = String(r[0] || '').trim();
          if (!name) return;
          const p3 = String(r[2] || '').trim().toUpperCase();
          const pr = p3.charAt(0) === 'M' ? 'Yüksek' : p3.charAt(0) === 'S' ? 'Orta' : 'Düşük';
          rows.push([s.title, name + (r[1] ? ' — ' + r[1] : ''), 'Yapım', pr, 'Açık']);
        });
      }
      if (q.type === 'list' && /özellik|mekanik|fiil|seviye|yetenek|araç|rota|sütun|sistem/i.test(q.label)) {
        v.forEach(x => { if (x && String(x).trim()) rows.push([s.title, String(x).trim(), 'Yapım', 'Orta', 'Açık']); });
      }
    });
  });
  return rows.map(r => r.map(csvCell).join(',')).join('\r\n');
}
function csvCell(s) {
  let t = String(s == null ? '' : s);
  // Excel/Sheets formül enjeksiyonu: =, +, -, @, tab, CR ile başlayan hücre formül olarak çalışır.
  if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
  return /[",\r\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
}

/* ---------------- ORTAK ---------------- */
function getTitle(project) {
  return findAnswer(project, 'identity', 'title') || project.name || 'Adsız Oyun';
}
function findAnswer(project, secId, qid) {
  const v = project.answers[secId + '.' + qid];
  return window.isEmptyVal(v) ? null : v;
}
function slug(s) {
  return String(s)
    .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // â î û é gibi aksanları düşür
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function safeFile(s) { return slug(s).slice(0, 60) || 'gdd'; }

function download(filename, content, mime) {
  const blob = new Blob([content], { type: (mime || 'text/plain') + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 120);
}

window.Exporters = {
  toMarkdown, toText, toDocHTML, toStandaloneHTML, toBacklogCSV,
  getTitle, download, safeFile, esc, slug, upperTR, coverMeta
};
})();
