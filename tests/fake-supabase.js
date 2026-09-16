/* Sahte Supabase — testler için.
 * Gerçek sunucuya bağlanmadan Cloud + Store mantığını sürer.
 * RLS'i de taklit eder ve ağ gibi JSON kopyası döner (referans paylaşmaz).
 *
 * Kullanım: window.girisYap('u1','kisi@ornek.com') ile kullanıcı değiştir,
 *           window.__DB ile sunucu durumunu incele.
 */
/* SAHTE SUPABASE
 * Gerçek sunucuya bağlanmadan Cloud + Store senkron mantığını test eder.
 * RLS'i de taklit eder: rol kontrolleri sunucu tarafında da uygulanır.
 */
const DB = { projects: [], members: [], invites: [], profiles: [] };
let AKTIF = null;   // { id, email }

function rlsCanRead(pid) {
  if (!AKTIF) return false;
  const p = DB.projects.find(x => x.id === pid);
  if (p && p.owner_id === AKTIF.id) return true;
  return DB.members.some(m => m.project_id === pid && m.user_id === AKTIF.id);
}
function rlsCanEdit(pid) {
  if (!AKTIF) return false;
  const p = DB.projects.find(x => x.id === pid);
  if (p && p.owner_id === AKTIF.id) return true;
  return DB.members.some(m => m.project_id === pid && m.user_id === AKTIF.id && (m.role === 'owner' || m.role === 'editor'));
}
function rlsIsOwner(pid) {
  if (!AKTIF) return false;
  const p = DB.projects.find(x => x.id === pid);
  return !!(p && p.owner_id === AKTIF.id);
}

/* Gerçek Supabase ağ üzerinden JSON gönderir — referans paylaşımı OLMAZ.
 * Sahte sunucu da aynı şekilde davranmalı, yoksa istemci hataları gizlenir. */
function kopya(x) { return x === undefined || x === null ? x : JSON.parse(JSON.stringify(x)); }
function sonuc(data, error) { return Promise.resolve({ data: data === undefined ? null : kopya(data), error: error || null }); }

const TABLO = { projects: 'projects', project_members: 'members', invites: 'invites', profiles: 'profiles' };

function tabloApi(tabloAdi) {
  const ad = TABLO[tabloAdi] || tabloAdi;
  const q = { _tablo: ad, _filtre: [], _tek: false, _maybe: false, _secim: null };
  q.select = function () { return q; };
  q.eq = function (k, v) { q._filtre.push([k, v, 'eq']); return q; };
  q.ilike = function (k, v) { q._filtre.push([k, String(v).toLowerCase(), 'ilike']); return q; };
  q.order = function () { return q; };
  q.single = function () { q._tek = true; return q.then ? q : q; };
  q.maybeSingle = function () { q._maybe = true; return q; };

  function uygula() {
    let rows = DB[ad].slice();
    q._filtre.forEach(([k, v, op]) => {
      rows = rows.filter(r => op === 'ilike' ? String(r[k]).toLowerCase() === v : r[k] === v);
    });
    if (ad === 'projects') rows = rows.filter(r => rlsCanRead(r.id));
    if (ad === 'members') rows = rows.filter(r => rlsCanRead(r.project_id));
    if (ad === 'invites') rows = rows.filter(r => rlsCanRead(r.project_id) ||
      String(r.email).toLowerCase() === (AKTIF ? AKTIF.email.toLowerCase() : ''));
    return rows;
  }

  q.then = function (res, rej) {
    const rows = uygula();
    const d = (q._tek || q._maybe) ? (rows[0] || null) : rows;
    if (q._tek && !rows.length) return Promise.resolve({ data: null, error: { message: 'satır yok' } }).then(res, rej);
    return Promise.resolve({ data: kopya(d), error: null }).then(res, rej);
  };

  q.insert = function (obj) {
    const kayit = kopya(obj);
    if (ad === 'projects') {
      if (!AKTIF || kayit.owner_id !== AKTIF.id) return sonuc(null, { message: 'RLS: kendi projeni oluşturabilirsin' });
      kayit.id = kayit.id || ('p' + (DB.projects.length + 1));
      kayit.created_at = new Date().toISOString();
      kayit.updated_at = new Date().toISOString();
      DB.projects.push(kayit);
      DB.members.push({ project_id: kayit.id, user_id: kayit.owner_id, role: 'owner' }); // tetikleyici
    } else if (ad === 'members') {
      if (!rlsIsOwner(kayit.project_id) && kayit.user_id !== (AKTIF || {}).id)
        return sonuc(null, { message: 'RLS: üye ekleyemezsin' });
      DB.members.push(kayit);
    } else if (ad === 'invites') {
      if (!rlsIsOwner(kayit.project_id)) return sonuc(null, { message: 'RLS: davet edemezsin' });
      DB.invites.push(kayit);
    }
    const api = { select: () => api, single: () => Promise.resolve({ data: kopya(kayit), error: null }),
                  then: (r, j) => Promise.resolve({ data: kopya(kayit), error: null }).then(r, j) };
    return api;
  };

  q.upsert = function (obj, opts) {
    const anahtar = (opts && opts.onConflict || '').split(',');
    const liste = DB[ad];
    const mevcut = liste.find(r => anahtar.every(k => String(r[k]).toLowerCase() === String(obj[k]).toLowerCase()));
    if (ad === 'members' && !rlsIsOwner(obj.project_id) && obj.user_id !== (AKTIF || {}).id)
      return sonuc(null, { message: 'RLS: üye ekleyemezsin' });
    if (ad === 'invites' && !rlsIsOwner(obj.project_id))
      return sonuc(null, { message: 'RLS: davet edemezsin' });
    if (mevcut) Object.assign(mevcut, kopya(obj)); else liste.push(kopya(obj));
    return sonuc(obj);
  };

  q.update = function (obj) {
    const api = {
      _f: [],
      eq(k, v) { this._f.push([k, v]); return this; },
      ilike(k, v) { this._f.push([k, String(v).toLowerCase()]); return this; },
      select() { return this; },
      single() { return this._calistir(true); },
      then(r, j) { return this._calistir(false).then(r, j); },
      _calistir(tek) {
        let rows = DB[ad].slice();
        this._f.forEach(([k, v]) => { rows = rows.filter(r => String(r[k]).toLowerCase() === String(v).toLowerCase()); });
        if (ad === 'projects') {
          const izinsiz = rows.filter(r => !rlsCanEdit(r.id));
          if (izinsiz.length) return sonuc(null, { message: 'RLS: düzenleme yetkin yok' });
        }
        if (ad === 'members') {
          const izinsiz = rows.filter(r => !rlsIsOwner(r.project_id));
          if (izinsiz.length) return sonuc(null, { message: 'RLS: rol değiştiremezsin' });
        }
        rows.forEach(r => { Object.assign(r, kopya(obj)); if (ad === 'projects') r.updated_at = new Date().toISOString(); });
        return sonuc(tek ? (rows[0] || null) : rows);
      }
    };
    return api;
  };

  q.delete = function () {
    const api = {
      _f: [],
      eq(k, v) { this._f.push([k, v]); return this; },
      ilike(k, v) { this._f.push([k, String(v).toLowerCase()]); return this; },
      then(r, j) {
        let kalan = [], silinen = [];
        DB[ad].forEach(row => {
          const eslesti = this._f.every(([k, v]) => String(row[k]).toLowerCase() === String(v).toLowerCase());
          (eslesti ? silinen : kalan).push(row);
        });
        if (ad === 'projects' && silinen.some(s => !rlsIsOwner(s.id)))
          return sonuc(null, { message: 'RLS: sadece sahibi silebilir' }).then(r, j);
        if (ad === 'members' && silinen.some(s => !rlsIsOwner(s.project_id) && s.user_id !== (AKTIF || {}).id))
          return sonuc(null, { message: 'RLS: üye çıkaramazsın' }).then(r, j);
        DB[ad] = kalan;
        return sonuc(silinen).then(r, j);
      }
    };
    return api;
  };

  return q;
}

let authCb = null;
window.supabase = {
  createClient() {
    return {
      auth: {
        getSession: () => Promise.resolve({ data: { session: AKTIF ? { user: { id: AKTIF.id, email: AKTIF.email, user_metadata: { full_name: AKTIF.email.split('@')[0] } } } : null } }),
        onAuthStateChange(cb) { authCb = cb; return { data: { subscription: { unsubscribe() {} } } }; },
        signInWithOAuth: () => Promise.resolve({ error: null }),
        signOut() { AKTIF = null; if (authCb) authCb('SIGNED_OUT', null); return Promise.resolve({ error: null }); }
      },
      from: tabloApi,
      rpc(ad, args) {
        if (ad === 'accept_my_invites') {
          if (!AKTIF) return sonuc([]);
          const mail = AKTIF.email.toLowerCase();
          const bekleyen = DB.invites.filter(i => String(i.email).toLowerCase() === mail && !i.accepted_at);
          bekleyen.forEach(i => {
            i.accepted_at = new Date().toISOString();
            const m = DB.members.find(x => x.project_id === i.project_id && x.user_id === AKTIF.id);
            if (m) m.role = i.role;
            else DB.members.push({ project_id: i.project_id, user_id: AKTIF.id, role: i.role });
          });
          return sonuc(bekleyen.map(i => ({ project_id: i.project_id, role: i.role })));
        }
        if (ad === 'project_members_detail') {
          const pid = args.p_project;
          if (!rlsCanRead(pid)) return sonuc([]);
          const uyeler = DB.members.filter(m => m.project_id === pid).map(m => {
            const pr = DB.profiles.find(p => p.id === m.user_id) || {};
            return { user_id: m.user_id, email: pr.email, full_name: pr.full_name, avatar_url: null, role: m.role, pending: false };
          });
          const davetler = DB.invites.filter(i => i.project_id === pid && !i.accepted_at)
            .map(i => ({ user_id: null, email: i.email, full_name: null, avatar_url: null, role: i.role, pending: true }));
          return sonuc(uyeler.concat(davetler));
        }
        return sonuc(null, { message: 'bilinmeyen rpc: ' + ad });
      }
    };
  }
};

/* Test yardımcısı: kullanıcı değiştir */
window.girisYap = function (id, email) {
  AKTIF = { id, email };
  if (!DB.profiles.find(p => p.id === id)) DB.profiles.push({ id, email, full_name: email.split('@')[0] });
  if (authCb) authCb('SIGNED_IN', { user: { id, email, user_metadata: { full_name: email.split('@')[0] } } });
};
window.__DB = DB;

window.GDD_CONFIG = { SUPABASE_URL: 'https://sahte.supabase.co', SUPABASE_ANON_KEY: 'eyJsahte' };
