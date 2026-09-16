/* GDD Creator — Alan render motoru
 * Bir soruyu DOM'a çevirir, değişiklikte onChange(value) çağırır.
 * Wizard ve editör aynı motoru kullanır → davranış tek yerde.
 */

(function () {
'use strict';
function el(tag, cls, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt !== undefined) e.textContent = txt;
  return e;
}

function debounce(fn, ms) {
  let t; return function () { clearTimeout(t); const a = arguments, s = this; t = setTimeout(() => fn.apply(s, a), ms); };
}

/* Değeri, tipin beklediği şekle normalize eder (bozuk/eski veriye karşı). */
function normalize(q, v) {
  switch (q.type) {
    case 'multi': case 'tags': case 'list':
      return Array.isArray(v) ? v : (v ? [String(v)] : []);
    case 'table': {
      const w = (q.cols || []).length || 3;
      if (!Array.isArray(v)) return [newRow(w)];
      const rows = v.filter(Array.isArray).map(r => { const a = r.slice(0, w); while (a.length < w) a.push(''); return a; });
      return rows.length ? rows : [newRow(w)];
    }
    case 'number': case 'scale':
      return v === undefined || v === null ? '' : v;
    default:
      return v === undefined || v === null ? '' : String(v);
  }
}
function newRow(w) { return Array.from({ length: w }, () => ''); }

/* Ana giriş noktası. */
function renderField(q, value, onChange, opts) {
  opts = opts || {};
  const wrap = el('div', 'field');
  wrap.dataset.qid = q.id;

  const lab = el('label', 'flabel');
  lab.appendChild(document.createTextNode(q.label));
  if (q.required) { const r = el('span', 'req', '*'); r.title = 'Zorunlu'; lab.appendChild(r); }
  if (opts.controls) lab.appendChild(opts.controls);
  wrap.appendChild(lab);

  const v = normalize(q, value);
  const body = buildInput(q, v, opts.readonly ? function () {} : onChange);
  wrap.appendChild(body);

  // Salt okunur: tüm girdi öğelerini gerçekten kilitle.
  // Sadece onChange'i yutmak yetmez — kullanıcı yazabiliyormuş gibi görünür.
  if (opts.readonly) {
    wrap.classList.add('readonly');
    lockInputs(body);
  }

  if (q.hint) wrap.appendChild(el('div', 'fhint', q.hint));
  return wrap;
}

/* Bir alanın içindeki her girdi öğesini salt okunur yapar. */
function lockInputs(root) {
  root.querySelectorAll('input, textarea').forEach(n => {
    n.readOnly = true;
    n.tabIndex = -1;
  });
  root.querySelectorAll('select').forEach(n => { n.disabled = true; });
  root.querySelectorAll('button').forEach(n => {
    n.disabled = true;
    n.tabIndex = -1;
  });
  if (root.tagName === 'INPUT' || root.tagName === 'TEXTAREA') { root.readOnly = true; root.tabIndex = -1; }
  if (root.tagName === 'SELECT') root.disabled = true;
}

function buildInput(q, v, onChange) {
  switch (q.type) {
    case 'text':     return textInput(q, v, onChange);
    case 'number':   return numberInput(q, v, onChange);
    case 'textarea': return textArea(q, v, onChange);
    case 'select':   return selectInput(q, v, onChange);
    case 'multi':    return chipsInput(q, v, onChange);
    case 'tags':     return tagsInput(q, v, onChange);
    case 'list':     return listInput(q, v, onChange);
    case 'table':    return tableInput(q, v, onChange);
    case 'scale':    return scaleInput(q, v, onChange);
    default:         return textArea(q, v, onChange);
  }
}

function textInput(q, v, onChange) {
  const i = el('input'); i.type = 'text'; i.value = v; i.placeholder = q.placeholder || '';
  i.addEventListener('input', debounce(() => onChange(i.value), 220));
  i.addEventListener('blur', () => onChange(i.value));
  return i;
}

function numberInput(q, v, onChange) {
  const i = el('input'); i.type = 'number'; i.value = v; i.placeholder = q.placeholder || '';
  i.addEventListener('input', debounce(() => onChange(i.value), 220));
  return i;
}

function textArea(q, v, onChange) {
  const t = el('textarea'); t.value = v; t.placeholder = q.placeholder || '';
  const grow = () => { t.style.height = 'auto'; t.style.height = Math.max(76, t.scrollHeight + 2) + 'px'; };
  t.addEventListener('input', () => { grow(); });
  t.addEventListener('input', debounce(() => onChange(t.value), 260));
  t.addEventListener('blur', () => onChange(t.value));
  setTimeout(grow, 0);
  return t;
}

function selectInput(q, v, onChange) {
  const s = el('select');
  const ph = el('option', null, '— seçiniz —'); ph.value = '';
  s.appendChild(ph);
  (q.options || []).forEach(o => { const op = el('option', null, o); op.value = o; s.appendChild(op); });
  // Listede olmayan (elle düzenlenmiş) değeri kaybetme
  if (v && !(q.options || []).includes(v)) {
    const op = el('option', null, v + '  (özel)'); op.value = v; s.appendChild(op);
  }
  s.value = v || '';
  s.addEventListener('change', () => onChange(s.value));
  return s;
}

function chipsInput(q, v, onChange) {
  const box = el('div', 'chips');
  const sel = new Set(v);
  (q.options || []).forEach(o => {
    const b = el('button', 'chip' + (sel.has(o) ? ' on' : ''), o);
    b.type = 'button';
    b.addEventListener('click', () => {
      if (sel.has(o)) { sel.delete(o); b.classList.remove('on'); }
      else { sel.add(o); b.classList.add('on'); }
      onChange(Array.from(sel));
    });
    box.appendChild(b);
  });
  return box;
}

function tagsInput(q, v, onChange) {
  const box = el('div', 'tags');
  let items = v.slice();
  const inp = el('input'); inp.type = 'text'; inp.placeholder = q.placeholder || 'Yaz ve Enter';

  function paint() {
    Array.from(box.querySelectorAll('.tag')).forEach(n => n.remove());
    items.forEach((t, i) => {
      const tag = el('span', 'tag');
      tag.appendChild(document.createTextNode(t));
      const x = el('button', null, '×'); x.type = 'button';
      x.addEventListener('click', () => { items.splice(i, 1); paint(); onChange(items.slice()); });
      tag.appendChild(x);
      box.insertBefore(tag, inp);
    });
  }
  function commit() {
    const raw = inp.value.trim();
    if (!raw) return;
    raw.split(',').map(s => s.trim()).filter(Boolean).forEach(s => { if (!items.includes(s)) items.push(s); });
    inp.value = ''; paint(); onChange(items.slice());
  }
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); }
    else if (e.key === 'Backspace' && !inp.value && items.length) { items.pop(); paint(); onChange(items.slice()); }
  });
  inp.addEventListener('blur', commit);
  box.appendChild(inp);
  paint();
  return box;
}

function listInput(q, v, onChange) {
  const box = el('div', 'list-box');
  let items = v.length ? v.slice() : [''];

  function emit() { onChange(items.filter(x => x && x.trim())); }

  function paint(focusIdx) {
    box.innerHTML = '';
    items.forEach((val, i) => {
      const row = el('div', 'lrow');
      row.appendChild(el('span', 'idx', String(i + 1)));
      const inp = el('input'); inp.type = 'text'; inp.value = val;
      inp.placeholder = q.placeholder || 'Madde ' + (i + 1);
      inp.addEventListener('input', debounce(() => { items[i] = inp.value; emit(); }, 220));
      inp.addEventListener('blur', () => { items[i] = inp.value; emit(); });
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          items[i] = inp.value;
          items.splice(i + 1, 0, '');
          paint(i + 1); emit();
        } else if (e.key === 'Backspace' && !inp.value && items.length > 1) {
          e.preventDefault();
          items.splice(i, 1); paint(Math.max(0, i - 1)); emit();
        }
      });
      row.appendChild(inp);
      const x = el('button', 'x', '×'); x.type = 'button'; x.title = 'Satırı sil';
      x.addEventListener('click', () => {
        items.splice(i, 1);
        if (!items.length) items = [''];
        paint(Math.max(0, i - 1)); emit();
      });
      row.appendChild(x);
      box.appendChild(row);
    });
    const add = el('button', 'btn sm ghost', '+ madde'); add.type = 'button';
    add.addEventListener('click', () => { items.push(''); paint(items.length - 1); });
    box.appendChild(add);
    if (focusIdx !== undefined) {
      const inputs = box.querySelectorAll('.lrow input');
      if (inputs[focusIdx]) inputs[focusIdx].focus();
    }
  }
  paint();
  return box;
}

function tableInput(q, v, onChange) {
  const cols = (q.cols && q.cols.length) ? q.cols : ['Sütun 1', 'Sütun 2', 'Sütun 3'];
  const box = el('div', 'tbl');
  let rows = v.map(r => r.slice());

  function emit() { onChange(rows.filter(r => r.some(c => c && String(c).trim())).map(r => r.slice())); }

  function paint(fr, fc) {
    box.innerHTML = '';
    const tb = el('table');
    const thead = el('thead'); const htr = el('tr');
    cols.forEach(c => htr.appendChild(el('th', null, c)));
    htr.appendChild(el('th', 'rx', ''));
    thead.appendChild(htr); tb.appendChild(thead);

    const tbody = el('tbody');
    rows.forEach((row, ri) => {
      const tr = el('tr');
      cols.forEach((c, ci) => {
        const td = el('td');
        const inp = el('input'); inp.type = 'text'; inp.value = row[ci] || '';
        inp.addEventListener('input', debounce(() => { rows[ri][ci] = inp.value; emit(); }, 220));
        inp.addEventListener('blur', () => { rows[ri][ci] = inp.value; emit(); });
        inp.addEventListener('keydown', e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            rows[ri][ci] = inp.value;
            if (ri === rows.length - 1) { rows.push(newRow(cols.length)); paint(rows.length - 1, 0); }
            else paint(ri + 1, ci);
            emit();
          }
        });
        td.appendChild(inp); tr.appendChild(td);
      });
      const rx = el('td', 'rx');
      const del = el('button', null, '×'); del.type = 'button'; del.title = 'Satırı sil';
      del.addEventListener('click', () => {
        rows.splice(ri, 1);
        if (!rows.length) rows = [newRow(cols.length)];
        paint(); emit();
      });
      rx.appendChild(del); tr.appendChild(rx);
      tbody.appendChild(tr);
    });
    tb.appendChild(tbody);

    const tfoot = el('tfoot'); const ftr = el('tr'); const ftd = el('td');
    ftd.colSpan = cols.length + 1;
    const add = el('button', null, '+ satır ekle'); add.type = 'button';
    add.addEventListener('click', () => { rows.push(newRow(cols.length)); paint(rows.length - 1, 0); });
    ftd.appendChild(add); ftr.appendChild(ftd); tfoot.appendChild(ftr); tb.appendChild(tfoot);

    box.appendChild(tb);
    if (fr !== undefined) {
      const trs = box.querySelectorAll('tbody tr');
      if (trs[fr]) { const ins = trs[fr].querySelectorAll('input'); if (ins[fc || 0]) ins[fc || 0].focus(); }
    }
  }
  paint();
  return box;
}

function scaleInput(q, v, onChange) {
  const box = el('div', 'scale');
  for (let i = 1; i <= 5; i++) {
    const b = el('button', 'scale-b' + (String(v) === String(i) ? ' on' : ''), String(i));
    b.type = 'button';
    b.addEventListener('click', () => {
      box.querySelectorAll('button').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); onChange(i);
    });
    box.appendChild(b);
  }
  return box;
}

window.Fields = { renderField, el, debounce, normalize };
})();
