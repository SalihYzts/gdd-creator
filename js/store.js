/* GDD Creator — Store: proje modeli, kalıcılık ve senkron
 *
 * İKİ KİP:
 *   local — localStorage (giriş yok ya da bulut kapalı)
 *   cloud — Supabase; bellekte önbellek + gecikmeli yazma kuyruğu
 *
 * Uygulama katmanı SENKRON API kullanır (list/get/save/create/remove).
 * Bulut kipinde yazmalar önbelleğe anında işlenir, sunucuya kuyrukla gider —
 * çünkü save() her tuş vuruşunda çağrılıyor.
 *
 * Bir PROJE = { id, name, genre, createdAt, updatedAt, sections[], answers{},
 *               cloud?, role?, ownerId? }
 */
(function () {
'use strict';

const KEY = 'gddcreator.projects.v1';
const SCHEMA_VERSION = 1;
const PUSH_DELAY = 1200;      // sunucuya yazmadan önce beklenen sessizlik

function uid(p) { return (p || 'id') + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }
function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
function now() { return new Date().toISOString(); }

/* ---------- YEREL DEPO ---------- */
function loadAll() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.error('Proje listesi okunamadı:', e);
    return [];
  }
}

function saveAll(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    console.error('Kaydedilemedi:', e);
    alert('Kaydedilemedi — tarayıcı deposu dolu olabilir. Projeyi JSON olarak dışa aktar.');
    return false;
  }
}

/* ---------- SENKRON DURUMU ---------- */
const Sync = {
  mode: 'local',            // 'local' | 'cloud'
  cache: [],                // bulut kipinde projeler
  durum: 'hazır',           // hazır | yazılıyor | kaydedildi | hata
  hata: null,
  _timers: {},              // projectId → timeout
  _bekleyen: {},            // projectId → proje
  _dinleyiciler: [],

  onDurum(fn) { this._dinleyiciler.push(fn); },
  _bildir() { this._dinleyiciler.forEach(f => { try { f(this.durum, this.hata); } catch (e) {} }); },
  _setDurum(d, h) { this.durum = d; this.hata = h || null; this._bildir(); },

  /* Projeyi kuyruğa alır; sessizlik sonrası sunucuya yazar. */
  kuyrukla(project) {
    this._bekleyen[project.id] = project;
    clearTimeout(this._timers[project.id]);
    this._setDurum('yazılıyor');
    this._timers[project.id] = setTimeout(() => this.gonder(project.id), PUSH_DELAY);
  },

  async gonder(id) {
    const p = this._bekleyen[id];
    if (!p) return;
    delete this._bekleyen[id];
    clearTimeout(this._timers[id]);
    try {
      await window.Cloud.save(p);
      this._setDurum(Object.keys(this._bekleyen).length ? 'yazılıyor' : 'kaydedildi');
    } catch (e) {
      console.error('Buluta yazılamadı:', e);
      this._bekleyen[id] = p;                 // kaybetme, tekrar denenecek
      this._setDurum('hata', e.message || String(e));
    }
  },

  /* Bekleyen tüm yazmaları hemen gönderir (sayfa kapanışı, çıkış vb.) */
  async flush() {
    const idler = Object.keys(this._bekleyen);
    for (const id of idler) await this.gonder(id);
  }
};

/* Sayfa kapanırken bekleyen yazma varsa uyar */
window.addEventListener('beforeunload', e => {
  if (Sync.mode === 'cloud' && Object.keys(Sync._bekleyen).length) {
    Sync.flush();
    e.preventDefault();
    e.returnValue = '';
    return '';
  }
});

/* ---------- ŞEMADAN BÖLÜM ÜRETME ---------- */
function materialize(sec, origin) {
  return {
    id: sec.id,
    title: sec.title,
    desc: sec.desc || '',
    origin: origin,
    enabled: true,
    questions: (sec.questions || []).map(q => ({
      id: q.id,
      label: q.label,
      type: q.type,
      hint: q.hint || '',
      placeholder: q.placeholder || '',
      options: q.options ? q.options.slice() : undefined,
      cols: q.cols ? q.cols.slice() : undefined,
      required: !!q.required,
      origin: origin
    }))
  };
}

function buildSections(genreKey, extras) {
  const S = window.SCHEMA;
  const out = [];
  S.CORE_ORDER.forEach(cid => {
    out.push(materialize(S.Q[cid], 'core'));
    if (cid === S.GENRE_INSERT_AFTER) {
      const g = S.GENRES[genreKey];
      if (g) g.sections.forEach(gs => out.push(materialize(gs, 'genre')));
    }
  });
  (extras || []).forEach(k => {
    const c = S.CONDITIONAL[k];
    if (c) out.push(materialize(c, 'conditional'));
  });
  return out;
}

const Store = {
  Sync: Sync,

  get mode() { return Sync.mode; },
  get isCloud() { return Sync.mode === 'cloud'; },

  /* Bulut kipine geçer ve önbelleği doldurur. */
  async useCloud() {
    Sync.mode = 'cloud';
    await this.refresh();
  },

  useLocal() {
    Sync.mode = 'local';
    Sync.cache = [];
  },

  async refresh() {
    if (Sync.mode !== 'cloud') return;
    Sync.cache = await window.Cloud.list();
  },

  list() {
    if (Sync.mode === 'cloud') {
      return Sync.cache.slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    }
    return loadAll().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  },

  /* Yerel projeler her zaman okunabilir (taşıma teklifi için) */
  listLocal() {
    return loadAll().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  },

  get(id) {
    if (Sync.mode === 'cloud') return Sync.cache.find(p => p.id === id) || null;
    return loadAll().find(p => p.id === id) || null;
  },

  create(name, genreKey, extras) {
    const bulut = Sync.mode === 'cloud';
    const p = {
      id: bulut ? uuid() : uid('gdd'),
      cloud: bulut,
      role: bulut ? 'owner' : undefined,
      ownerId: bulut && window.Cloud.user ? window.Cloud.user.id : undefined,
      schemaVersion: SCHEMA_VERSION,
      name: name || 'Adsız Proje',
      genre: genreKey,
      extras: extras || [],
      createdAt: now(),
      updatedAt: now(),
      sections: buildSections(genreKey, extras),
      answers: {}
    };
    if (bulut) {
      Sync.cache.push(p);
      // Sunucuya hemen yarat — sonraki save'ler güncelleme olacak
      window.Cloud.createWithId(p).catch(e => {
        console.error('Proje buluta yazılamadı:', e);
        Sync._setDurum('hata', e.message);
      });
    } else {
      const all = loadAll();
      all.push(p);
      saveAll(all);
    }
    return p;
  },

  save(project) {
    project.updatedAt = now();
    if (Sync.mode === 'cloud' && project.cloud) {
      if (project.role === 'viewer') return project;   // izleyen yazamaz
      const i = Sync.cache.findIndex(p => p.id === project.id);
      if (i >= 0) Sync.cache[i] = project; else Sync.cache.push(project);
      Sync.kuyrukla(project);
      return project;
    }
    const all = loadAll();
    const i = all.findIndex(p => p.id === project.id);
    if (i >= 0) all[i] = project; else all.push(project);
    saveAll(all);
    return project;
  },

  remove(id) {
    if (Sync.mode === 'cloud') {
      Sync.cache = Sync.cache.filter(p => p.id !== id);
      clearTimeout(Sync._timers[id]);
      delete Sync._bekleyen[id];
      window.Cloud.remove(id).catch(e => {
        console.error('Silinemedi:', e);
        Sync._setDurum('hata', e.message);
      });
      return;
    }
    saveAll(loadAll().filter(p => p.id !== id));
  },

  /* Yerel kopyayı siler (buluta taşındıktan sonra) */
  removeLocal(id) {
    saveAll(loadAll().filter(p => p.id !== id));
  },

  importProject(obj) {
    if (!obj || typeof obj !== 'object') throw new Error('Geçersiz dosya');
    if (!Array.isArray(obj.sections)) throw new Error('Dosyada "sections" yok — bu bir GDD Creator proje dosyası değil.');
    const bulut = Sync.mode === 'cloud';
    const p = {
      id: bulut ? uuid() : uid('gdd'),
      cloud: bulut,
      role: bulut ? 'owner' : undefined,
      ownerId: bulut && window.Cloud.user ? window.Cloud.user.id : undefined,
      schemaVersion: SCHEMA_VERSION,
      name: (obj.name || 'İçe aktarılan proje'),
      genre: obj.genre || 'other',
      extras: Array.isArray(obj.extras) ? obj.extras : [],
      createdAt: obj.createdAt || now(),
      updatedAt: now(),
      sections: obj.sections,
      answers: obj.answers && typeof obj.answers === 'object' ? obj.answers : {}
    };
    if (bulut) {
      Sync.cache.push(p);
      window.Cloud.createWithId(p).catch(e => {
        console.error('İçe aktarılan proje buluta yazılamadı:', e);
        Sync._setDurum('hata', e.message);
      });
    } else {
      const all = loadAll();
      all.push(p);
      saveAll(all);
    }
    return p;
  },

  /* Bu projede düzenleme yetkisi var mı? */
  canEdit(project) {
    if (!project) return false;
    if (Sync.mode !== 'cloud' || !project.cloud) return true;
    return project.role === 'owner' || project.role === 'editor';
  },

  isOwner(project) {
    if (!project) return false;
    if (Sync.mode !== 'cloud' || !project.cloud) return true;
    return project.role === 'owner';
  },

  /* ---- Bölüm işlemleri ---- */
  addSection(project, title) {
    const sec = {
      id: uid('sec'), title: title || 'Yeni Bölüm', desc: '',
      origin: 'custom', enabled: true, questions: []
    };
    project.sections.push(sec);
    return sec;
  },

  removeSection(project, secId) {
    const i = project.sections.findIndex(s => s.id === secId);
    if (i < 0) return;
    project.sections[i].questions.forEach(q => { delete project.answers[secId + '.' + q.id]; });
    project.sections.splice(i, 1);
  },

  moveSection(project, from, to) {
    if (to < 0 || to >= project.sections.length) return;
    const [s] = project.sections.splice(from, 1);
    project.sections.splice(to, 0, s);
  },

  addQuestion(project, secId, q) {
    const sec = project.sections.find(s => s.id === secId);
    if (!sec) return null;
    const nq = {
      id: uid('q'), label: q.label || 'Yeni soru', type: q.type || 'textarea',
      hint: q.hint || '', placeholder: q.placeholder || '',
      options: q.options, cols: q.cols, required: false, origin: 'custom'
    };
    sec.questions.push(nq);
    return nq;
  },

  removeQuestion(project, secId, qid) {
    const sec = project.sections.find(s => s.id === secId);
    if (!sec) return;
    sec.questions = sec.questions.filter(q => q.id !== qid);
    delete project.answers[secId + '.' + qid];
  },

  moveQuestion(project, secId, from, to) {
    const sec = project.sections.find(s => s.id === secId);
    if (!sec || to < 0 || to >= sec.questions.length) return;
    const [q] = sec.questions.splice(from, 1);
    sec.questions.splice(to, 0, q);
  },

  attachModule(project, kind, key) {
    const S = window.SCHEMA;
    let secs = [];
    if (kind === 'genre' && S.GENRES[key]) secs = S.GENRES[key].sections.map(s => materialize(s, 'genre'));
    else if (kind === 'conditional' && S.CONDITIONAL[key]) secs = [materialize(S.CONDITIONAL[key], 'conditional')];
    const added = [];
    secs.forEach(s => {
      if (project.sections.some(x => x.id === s.id)) return;
      project.sections.push(s);
      added.push(s);
    });
    if (kind === 'conditional' && added.length && !project.extras.includes(key)) project.extras.push(key);
    return added;
  },

  /* ---- Cevap yardımcıları ---- */
  key(secId, qid) { return secId + '.' + qid; },

  getAnswer(project, secId, qid) { return project.answers[secId + '.' + qid]; },

  setAnswer(project, secId, qid, val) {
    const k = secId + '.' + qid;
    const empty = val === '' || val === null || val === undefined ||
                  (Array.isArray(val) && val.length === 0);
    if (empty) delete project.answers[k]; else project.answers[k] = val;
  },

  stats(project) {
    let total = 0, filled = 0, reqTotal = 0, reqFilled = 0;
    project.sections.forEach(s => {
      if (!s.enabled) return;
      s.questions.forEach(q => {
        total++;
        const v = project.answers[s.id + '.' + q.id];
        const has = !isEmptyVal(v);
        if (has) filled++;
        if (q.required) { reqTotal++; if (has) reqFilled++; }
      });
    });
    return { total, filled, reqTotal, reqFilled, pct: total ? Math.round(filled / total * 100) : 0 };
  },

  sectionStats(project, sec) {
    let t = 0, f = 0;
    sec.questions.forEach(q => { t++; if (!isEmptyVal(project.answers[sec.id + '.' + q.id])) f++; });
    return { total: t, filled: f };
  }
};

function isEmptyVal(v) {
  if (v === undefined || v === null || v === '') return true;
  if (Array.isArray(v)) {
    if (v.length === 0) return true;
    return v.every(row => Array.isArray(row)
      ? row.every(c => c === undefined || c === null || !String(c).trim())
      : (row === undefined || row === null || !String(row).trim()));
  }
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

window.Store = Store;
window.isEmptyVal = isEmptyVal;
window.uid = uid;
window.uuid = uuid;
})();
