/* GDD Creator — Uygulama
 * Ekranlar: #home (proje listesi) → #wizard (anket) → #editor (doküman)
 */

(function () {
'use strict';
const el = window.Fields.el;
const S = () => window.SCHEMA;

const App = {
  project: null,
  wizIndex: 0,
  showPreview: true,
  mobilePreview: false,   // dar ekranda doküman sekmesi açık mı
  activeSec: null,
  _narrow: null,

  init() {
    this.bindGlobal();
    this.renderAuthBar();
    this.route();
    window.addEventListener('hashchange', () => this.route());

    if (window.Cloud && window.Cloud.enabled) {
      window.Cloud.onChange(() => this.onAuthChange());
      window.Cloud.init().then(() => this.onAuthChange())
        .catch(e => console.error('Bulut başlatılamadı:', e));
      window.Store.Sync.onDurum((d, h) => this.renderSyncBadge(d, h));
    }
  },

  /* Giriş/çıkış olduğunda: depo kipini değiştir, ekranı tazele. */
  async onAuthChange() {
    const C = window.Cloud;
    this.renderAuthBar();
    if (!C || !C.enabled) return;

    if (C.signedIn) {
      try {
        await window.Store.useCloud();
      } catch (e) {
        console.error('Bulut projeleri alınamadı:', e);
        this.toast('Bulut projelerine ulaşılamadı: ' + (e.message || e));
        return;
      }
      this.route();
      this.teklifTasima();
    } else {
      window.Store.useLocal();
      this.route();
    }
  },

  /* Girişten sonra yerelde proje varsa buluta taşımayı teklif et. */
  teklifTasima() {
    const yerel = window.Store.listLocal();
    if (!yerel.length) return;
    if (sessionStorage.getItem('gdd.tasima.soruldu') === '1') return;
    sessionStorage.setItem('gdd.tasima.soruldu', '1');

    const { bg, body, foot } = this.modal('Yerel projeleri hesabına taşı');
    body.appendChild(el('div', 'fhint',
      'Bu tarayıcıda giriş yapmadan oluşturulmuş ' + yerel.length +
      ' proje var. Hesabına taşırsan her cihazdan erişebilir ve paylaşabilirsin.'));
    const liste = el('div', 'chips');
    yerel.forEach(p => liste.appendChild(el('span', 'tag', p.name)));
    body.appendChild(liste);

    const sonra = el('button', 'btn', 'Şimdi değil');
    sonra.addEventListener('click', () => bg.remove());
    const tasi = el('button', 'btn primary', 'Hesabıma taşı');
    tasi.addEventListener('click', async () => {
      tasi.disabled = true; tasi.textContent = 'Taşınıyor…';
      try {
        const sonuc = await window.Cloud.migrateLocal(yerel);
        const ok = sonuc.filter(r => r.ok);
        ok.forEach(r => window.Store.removeLocal(r.yerelId));
        await window.Store.refresh();
        bg.remove();
        this.route();
        const basarisiz = sonuc.filter(r => !r.ok);
        this.toast(ok.length + ' proje taşındı' + (basarisiz.length ? ', ' + basarisiz.length + ' başarısız' : ''));
        if (basarisiz.length) console.error('Taşınamayanlar:', basarisiz);
      } catch (e) {
        tasi.disabled = false; tasi.textContent = 'Hesabıma taşı';
        alert('Taşınamadı: ' + (e.message || e));
      }
    });
    foot.appendChild(sonra); foot.appendChild(tasi);
  },

  /* Üst çubuktaki giriş/hesap alanı */
  renderAuthBar() {
    const bar = document.getElementById('authbar');
    if (!bar) return;
    bar.innerHTML = '';
    const C = window.Cloud;
    if (!C || !C.enabled) {
      const s = el('span', 'crumb', 'yerel kip');
      s.title = 'Bulut yapılandırılmamış — projeler yalnızca bu tarayıcıda saklanır.';
      bar.appendChild(s);
      return;
    }

    if (C.signedIn) {
      const rozet = el('span', 'sync', 'kayıtlı');
      rozet.id = 'syncBadge';
      bar.appendChild(rozet);

      const kisi = el('button', 'btn sm ghost');
      const p = C.profile || {};
      kisi.appendChild(el('span', 'who', p.full_name || p.email || 'Hesap'));
      kisi.title = p.email || '';
      kisi.addEventListener('click', () => this.hesapModal());
      bar.appendChild(kisi);
    } else {
      const g = el('button', 'btn sm primary', 'Giriş yap');
      g.addEventListener('click', () => this.girisModal());
      bar.appendChild(g);
    }
  },

  /* Giriş / kayıt penceresi */
  girisModal(kip) {
    kip = kip || 'giris';                       // 'giris' | 'kayit' | 'sifirla'
    const baslik = { giris: 'Giriş yap', kayit: 'Hesap oluştur', sifirla: 'Şifre sıfırla' };
    const { bg, body, foot } = this.modal(baslik[kip]);

    const hata = el('div', 'auth-err');
    hata.style.display = 'none';
    body.appendChild(hata);
    const goster = m => { hata.textContent = m; hata.style.display = 'block'; };

    // Google — yalnızca sağlayıcı yapılandırılmışsa anlamlı.
    // Yapılandırılmamışsa Supabase 400 döner; kullanıcıya açık mesaj veriyoruz.
    const gbtn = el('button', 'btn wide', 'Google ile devam et');
    gbtn.addEventListener('click', async () => {
      gbtn.disabled = true; gbtn.textContent = 'Yönlendiriliyor…';
      try { await window.Cloud.signInWithGoogle(); }
      catch (e) {
        gbtn.disabled = false; gbtn.textContent = 'Google ile devam et';
        goster(/provider/i.test(e.message || '')
          ? 'Google girişi henüz açık değil — e-posta ile devam et.'
          : 'Google girişi başarısız: ' + e.message);
      }
    });
    body.appendChild(gbtn);
    body.appendChild(el('div', 'auth-ayrac', 'ya da'));

    const fMail = el('div', 'field');
    fMail.appendChild(Object.assign(el('label', 'flabel'), { textContent: 'E-posta' }));
    const iMail = el('input'); iMail.type = 'email'; iMail.placeholder = 'sen@ornek.com';
    iMail.autocomplete = 'email';
    fMail.appendChild(iMail); body.appendChild(fMail);

    let iSifre = null, iAd = null;
    if (kip !== 'sifirla') {
      if (kip === 'kayit') {
        const fAd = el('div', 'field');
        fAd.appendChild(Object.assign(el('label', 'flabel'), { textContent: 'Adın' }));
        iAd = el('input'); iAd.type = 'text'; iAd.placeholder = 'Görünecek isim';
        fAd.appendChild(iAd); body.appendChild(fAd);
      }
      const fSifre = el('div', 'field');
      fSifre.appendChild(Object.assign(el('label', 'flabel'), { textContent: 'Şifre' }));
      iSifre = el('input'); iSifre.type = 'password';
      iSifre.autocomplete = kip === 'kayit' ? 'new-password' : 'current-password';
      iSifre.placeholder = kip === 'kayit' ? 'En az 6 karakter' : '';
      fSifre.appendChild(iSifre); body.appendChild(fSifre);
    }

    const alt = el('div', 'auth-alt');
    if (kip === 'giris') {
      const k = el('button', 'lnk', 'Hesabın yok mu? Oluştur');
      k.addEventListener('click', () => { bg.remove(); this.girisModal('kayit'); });
      const u = el('button', 'lnk', 'Şifremi unuttum');
      u.addEventListener('click', () => { bg.remove(); this.girisModal('sifirla'); });
      alt.appendChild(k); alt.appendChild(u);
    } else {
      const g2 = el('button', 'lnk', '← Girişe dön');
      g2.addEventListener('click', () => { bg.remove(); this.girisModal('giris'); });
      alt.appendChild(g2);
    }
    body.appendChild(alt);

    const vazgec = el('button', 'btn', 'Vazgeç');
    vazgec.addEventListener('click', () => bg.remove());
    const onay = el('button', 'btn primary',
      kip === 'kayit' ? 'Hesap oluştur' : (kip === 'sifirla' ? 'Sıfırlama bağlantısı gönder' : 'Giriş yap'));

    onay.addEventListener('click', async () => {
      const mail = iMail.value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { goster('Geçerli bir e-posta yaz.'); iMail.focus(); return; }
      if (kip !== 'sifirla' && (!iSifre.value || iSifre.value.length < 6)) {
        goster('Şifre en az 6 karakter olmalı.'); iSifre.focus(); return;
      }
      onay.disabled = true; const eski = onay.textContent; onay.textContent = '…';
      try {
        if (kip === 'kayit') {
          const r = await window.Cloud.signUpWithEmail(mail, iSifre.value, iAd ? iAd.value.trim() : '');
          bg.remove();
          if (r.dogrulamaGerekli) {
            this.bilgiModal('E-postanı doğrula',
              mail + ' adresine bir doğrulama bağlantısı gönderdik. Bağlantıya tıkladıktan sonra giriş yapabilirsin.');
          } else {
            this.toast('Hoş geldin!');
          }
        } else if (kip === 'sifirla') {
          await window.Cloud.resetPassword(mail);
          bg.remove();
          this.bilgiModal('Bağlantı gönderildi',
            mail + ' adresine şifre sıfırlama bağlantısı gönderdik.');
        } else {
          await window.Cloud.signInWithEmail(mail, iSifre.value);
          bg.remove();
          this.toast('Giriş yapıldı');
        }
      } catch (e) {
        onay.disabled = false; onay.textContent = eski;
        const m = (e.message || '').toLowerCase();
        if (m.includes('invalid login')) goster('E-posta ya da şifre hatalı.');
        else if (m.includes('already registered') || m.includes('already been registered'))
          goster('Bu e-posta zaten kayıtlı — giriş yapmayı dene.');
        else if (m.includes('email not confirmed')) goster('Önce e-postandaki doğrulama bağlantısına tıkla.');
        else if (m.includes('signups not allowed')) goster('Kayıtlar şu an kapalı.');
        else goster(e.message || 'Bir şeyler ters gitti.');
      }
    });

    [iMail, iSifre, iAd].forEach(n => {
      if (n) n.addEventListener('keydown', e => { if (e.key === 'Enter') onay.click(); });
    });

    foot.appendChild(vazgec); foot.appendChild(onay);
    setTimeout(() => iMail.focus(), 40);
  },

  bilgiModal(baslik, metin) {
    const { bg, body, foot } = this.modal(baslik);
    body.appendChild(el('div', 'fhint', metin));
    const k = el('button', 'btn primary', 'Tamam');
    k.addEventListener('click', () => bg.remove());
    foot.appendChild(k);
  },

  renderSyncBadge(durum, hata) {
    const b = document.getElementById('syncBadge');
    if (!b) return;
    const metin = { 'hazır': 'kayıtlı', 'yazılıyor': 'kaydediliyor…', 'kaydedildi': 'kayıtlı', 'hata': 'kaydedilemedi' };
    b.textContent = metin[durum] || durum;
    b.className = 'sync' + (durum === 'hata' ? ' err' : (durum === 'yazılıyor' ? ' busy' : ''));
    b.title = hata || '';
  },

  hesapModal() {
    const C = window.Cloud;
    const p = C.profile || {};
    const { bg, body, foot } = this.modal('Hesap');
    const k = el('div', 'field');
    k.appendChild(el('div', 'flabel', p.full_name || '—'));
    k.appendChild(el('div', 'fhint', p.email || ''));
    body.appendChild(k);
    const n = window.Store.list().length;
    body.appendChild(el('div', 'fhint', n + ' proje hesabında saklanıyor.'));

    const kapat = el('button', 'btn', 'Kapat');
    kapat.addEventListener('click', () => bg.remove());
    const cik = el('button', 'btn danger', 'Çıkış yap');
    cik.addEventListener('click', async () => {
      cik.disabled = true;
      await window.Store.Sync.flush();
      await window.Cloud.signOut();
      sessionStorage.removeItem('gdd.tasima.soruldu');
      bg.remove();
      this.go('home');
    });
    foot.appendChild(cik); foot.appendChild(kapat);
  },

  /* ---------- yönlendirme ---------- */
  route() {
    const h = location.hash.slice(1);
    const [screen, id] = h.split('/');
    if (screen === 'wizard' && id) {
      const p = window.Store.get(id);
      if (!p) return this.go('home');
      this.project = p; this.wizIndex = 0; this.renderWizard();
      this.show('wizard');
    } else if (screen === 'editor' && id) {
      const p = window.Store.get(id);
      if (!p) return this.go('home');
      this.project = p;
      this.activeSec = (p.sections.find(s => s.enabled) || p.sections[0] || {}).id;
      this.renderEditor();
      this.show('editor');
    } else {
      this.project = null;
      this.renderHome();
      this.show('home');
    }
  },

  go(screen, id) { location.hash = screen + (id ? '/' + id : ''); },

  show(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'sc-' + name));
    this.crumb(name);
  },

  crumb(name) {
    const c = document.getElementById('crumb');
    if (name === 'home') { c.innerHTML = '<b>Projeler</b>'; return; }
    const p = this.project;
    const g = (S().GENRES[p.genre] || {}).label || '';
    c.innerHTML = 'Projeler <span class="sep">/</span> <b>' + window.Exporters.esc(p.name) + '</b>' +
      (g ? ' <span class="sep">·</span> ' + window.Exporters.esc(g) : '') +
      ' <span class="sep">/</span> ' + (name === 'wizard' ? 'Anket' : 'Doküman');
  },

  save() {
    if (this.project) window.Store.save(this.project);
  },

  toast(msg) {
    const old = document.querySelector('.toast'); if (old) old.remove();
    const t = el('div', 'toast', msg);
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  },

  isNarrow() { return window.innerWidth <= 1150; },

  bindGlobal() {
    // Dar ↔ geniş eşiği geçilince editörü yeniden kur (sekme/sütun davranışı değişir)
    this._narrow = this.isNarrow();
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        const n = this.isNarrow();
        if (n !== this._narrow) {
          this._narrow = n;
          if (!n) this.mobilePreview = false;
          if (this.project && location.hash.indexOf('#editor') === 0) this.renderEditor();
        }
      }, 160);
    });

    document.addEventListener('keydown', e => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 's') { e.preventDefault(); this.save(); this.toast('Kaydedildi'); }
      if (mod && e.key === 'e' && this.project) { e.preventDefault(); this.exportModal(); }
      if (e.key === 'Escape') { const m = document.querySelector('.modal-bg'); if (m) m.remove(); }
    });
  },

  /* ================= EKRAN 1: PROJELER ================= */
  renderHome() {
    const root = document.getElementById('sc-home');
    root.innerHTML = '';
    const wrap = el('div', 'wrap');

    const head = el('div', 'list-head');
    head.appendChild(el('h1', null, 'Projeler'));
    const projects = window.Store.list();
    head.appendChild(el('span', 'count', projects.length + ' PROJE'));
    head.appendChild(el('div', 'spacer'));

    const imp = el('button', 'btn', '↑ JSON içe aktar');
    imp.addEventListener('click', () => this.importJSON());
    head.appendChild(imp);

    const nb = el('button', 'btn primary', '+ Yeni GDD');
    nb.addEventListener('click', () => this.newProjectModal());
    head.appendChild(nb);
    wrap.appendChild(head);

    if (!projects.length) {
      const e = el('div', 'empty');
      e.appendChild(el('div', 'big', 'HENÜZ PROJE YOK'));
      e.appendChild(el('div', 'sub', 'Yeni bir GDD başlat; tür seç, sorulara cevap ver, doküman oluşsun.'));
      const b = el('button', 'btn primary', '+ İlk GDD\'yi oluştur');
      b.addEventListener('click', () => this.newProjectModal());
      e.appendChild(b);
      wrap.appendChild(e);
    } else {
      const grid = el('div', 'pgrid');
      projects.forEach(p => grid.appendChild(this.projectCard(p)));
      wrap.appendChild(grid);
    }
    root.appendChild(wrap);
  },

  projectCard(p) {
    const c = el('div', 'pcard');
    const st = window.Store.stats(p);
    const g = S().GENRES[p.genre] || {};

    c.appendChild(el('div', 'ptitle', p.name));
    const meta = el('div', 'pmeta');
    meta.appendChild(el('span', 'ptag', (g.icon ? g.icon + ' ' : '') + (g.label || 'Tür yok')));
    if (p.cloud && p.role && p.role !== 'owner') {
      const r = el('span', 'ptag rol', p.role === 'editor' ? 'düzenleyen' : 'izleyen');
      r.title = 'Bu proje seninle paylaşıldı';
      meta.appendChild(r);
    }
    c.appendChild(meta);

    const tl = p.answers['identity.tagline'];
    c.appendChild(el('div', 'pline', tl || '—'));

    const bar = el('div', 'pbar');
    const i = el('i'); i.style.width = st.pct + '%';
    bar.appendChild(i); c.appendChild(bar);

    const foot = el('div', 'pfoot');
    foot.appendChild(el('span', null, st.filled + '/' + st.total + ' · %' + st.pct));
    foot.appendChild(el('span', null, new Date(p.updatedAt).toLocaleDateString('tr-TR')));
    c.appendChild(foot);

    if (window.Store.isOwner(p)) {
      const del = el('button', 'del', '×'); del.title = 'Projeyi sil';
      del.addEventListener('click', ev => {
        ev.stopPropagation();
        if (confirm('"' + p.name + '" silinsin mi? Bu geri alınamaz.')) {
          window.Store.remove(p.id); this.renderHome(); this.toast('Silindi');
        }
      });
      c.appendChild(del);
    } else if (p.cloud) {
      const ayril = el('button', 'del', '⏻'); ayril.title = 'Projeden ayrıl';
      ayril.addEventListener('click', async ev => {
        ev.stopPropagation();
        if (!confirm('"' + p.name + '" projesinden ayrılmak istiyor musun?')) return;
        try {
          await window.Cloud.removeMember(p.id, window.Cloud.user.id);
          await window.Store.refresh();
          this.renderHome(); this.toast('Projeden ayrıldın');
        } catch (e) { alert('Ayrılamadı: ' + e.message); }
      });
      c.appendChild(ayril);
    }

    c.addEventListener('click', () => {
      // hiç cevap yoksa ankete, varsa editöre
      this.go(st.filled === 0 ? 'wizard' : 'editor', p.id);
    });
    return c;
  },

  /* ---------- yeni proje akışı ---------- */
  newProjectModal() {
    let name = '';
    let genre = null;
    let extras = [];

    const { bg, body, foot } = this.modal('Yeni GDD', true);

    const nf = el('div', 'field');
    const nl = el('label', 'flabel'); nl.textContent = 'Proje adı';
    nl.appendChild(el('span', 'req', '*'));
    nf.appendChild(nl);
    const ni = el('input'); ni.type = 'text'; ni.placeholder = 'Oyunun adı ya da çalışma adı';
    ni.addEventListener('input', () => { name = ni.value; validate(); });
    nf.appendChild(ni);
    body.appendChild(nf);

    const gf = el('div', 'field');
    const gl = el('label', 'flabel'); gl.textContent = 'Tür';
    gl.appendChild(el('span', 'req', '*'));
    gf.appendChild(gl);
    gf.appendChild(el('div', 'fhint', 'Tür, ankete o türe özel bir bölüm ekler. Sonradan değiştirebilirsin.'));
    const gg = el('div', 'genre-grid');
    Object.keys(S().GENRES).forEach(k => {
      const g = S().GENRES[k];
      const b = el('button', 'gcard'); b.type = 'button';
      b.appendChild(el('div', 'gicon', g.icon));
      b.appendChild(el('div', 'gname', g.label));
      b.appendChild(el('div', 'gdesc', g.desc));
      b.addEventListener('click', () => {
        genre = k;
        gg.querySelectorAll('.gcard').forEach(x => x.classList.remove('sel'));
        b.classList.add('sel');
        validate();
      });
      gg.appendChild(b);
    });
    gf.appendChild(gg);
    body.appendChild(gf);

    const ef = el('div', 'field');
    ef.appendChild(Object.assign(el('label', 'flabel'), { textContent: 'Ek modüller' }));
    ef.appendChild(el('div', 'fhint', 'Sadece geçerli olanları işaretle. Sonradan da eklenebilir.'));
    const ec = el('div', 'chips');
    Object.keys(S().CONDITIONAL).forEach(k => {
      const m = S().CONDITIONAL[k];
      const b = el('button', 'chip', m.title); b.type = 'button';
      b.addEventListener('click', () => {
        if (extras.includes(k)) { extras = extras.filter(x => x !== k); b.classList.remove('on'); }
        else { extras.push(k); b.classList.add('on'); }
      });
      ec.appendChild(b);
    });
    ef.appendChild(ec);
    body.appendChild(ef);

    const cancel = el('button', 'btn', 'Vazgeç');
    cancel.addEventListener('click', () => bg.remove());
    const ok = el('button', 'btn primary', 'Oluştur →');
    ok.disabled = true;
    ok.addEventListener('click', () => {
      const p = window.Store.create(name.trim(), genre, extras);
      window.Store.setAnswer(p, 'identity', 'title', name.trim());
      window.Store.save(p);
      bg.remove();
      this.go('wizard', p.id);
    });
    function validate() { ok.disabled = !(name.trim() && genre); }
    foot.appendChild(cancel); foot.appendChild(ok);
    setTimeout(() => ni.focus(), 30);
    ni.addEventListener('keydown', e => { if (e.key === 'Enter' && !ok.disabled) ok.click(); });
  },

  importJSON() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.addEventListener('change', () => {
      const f = inp.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const p = window.Store.importProject(JSON.parse(r.result));
          this.toast('İçe aktarıldı: ' + p.name);
          this.go('editor', p.id);
        } catch (e) {
          alert('İçe aktarılamadı: ' + e.message);
        }
      };
      r.readAsText(f);
    });
    inp.click();
  },

  /* ================= EKRAN 2: ANKET ================= */
  activeSections() { return this.project.sections.filter(s => s.enabled); },

  renderWizard() {
    const root = document.getElementById('sc-wizard');
    root.innerHTML = '';
    const secs = this.activeSections();
    if (!secs.length) return this.go('editor', this.project.id);
    this.wizIndex = Math.min(this.wizIndex, secs.length - 1);

    const wiz = el('div', 'wiz');

    // sol gezinme
    const nav = el('div', 'wiz-nav');
    nav.appendChild(el('div', 'nlabel', 'Bölümler'));
    secs.forEach((s, i) => {
      const st = window.Store.sectionStats(this.project, s);
      const done = st.total > 0 && st.filled === st.total;
      const b = el('button', 'nstep' + (i === this.wizIndex ? ' active' : '') + (done ? ' done' : ''));
      b.appendChild(el('span', 'dot', done ? '●' : (st.filled ? '◐' : '○')));
      b.appendChild(el('span', 'ntxt', s.title));
      b.addEventListener('click', () => { this.wizIndex = i; this.renderWizard(); });
      nav.appendChild(b);
    });
    wiz.appendChild(nav);

    // gövde
    const bodyWrap = el('div', 'wiz-body');
    const inner = el('div', 'wiz-inner');
    const sec = secs[this.wizIndex];
    inner.appendChild(el('div', 'sec-title', sec.title));
    inner.appendChild(el('div', 'sec-desc', sec.desc || ''));

    if (!sec.questions.length) {
      inner.appendChild(el('div', 'empty', 'Bu bölümde soru yok.'));
    }
    sec.questions.forEach(q => {
      const wizEdit = window.Store.canEdit(this.project);
      const f = window.Fields.renderField(q, window.Store.getAnswer(this.project, sec.id, q.id), val => {
        if (!wizEdit) return;
        window.Store.setAnswer(this.project, sec.id, q.id, val);
        this.save();
        this.reactToAnswer(sec.id, q.id, val);
      }, { readonly: !wizEdit });
      inner.appendChild(f);
    });

    // alt bar
    const foot = el('div', 'wiz-foot');
    const back = el('button', 'btn', '← Geri');
    back.disabled = this.wizIndex === 0;
    back.addEventListener('click', () => { this.wizIndex--; this.renderWizard(); bodyWrap.scrollTop = 0; });
    foot.appendChild(back);

    const skip = el('button', 'btn ghost', 'Atla');
    skip.addEventListener('click', () => next());
    foot.appendChild(skip);

    foot.appendChild(el('div', 'spacer'));
    const st = window.Store.stats(this.project);
    foot.appendChild(el('span', 'prog', (this.wizIndex + 1) + '/' + secs.length + '  ·  %' + st.pct + ' dolu'));

    const fin = el('button', 'btn', 'Dokümana geç →');
    fin.addEventListener('click', () => { this.save(); this.go('editor', this.project.id); });
    foot.appendChild(fin);

    const nx = el('button', 'btn primary', 'İleri →');
    if (this.wizIndex === secs.length - 1) nx.style.display = 'none';
    nx.addEventListener('click', () => next());
    foot.appendChild(nx);

    const self = this;
    function next() {
      if (self.wizIndex < secs.length - 1) { self.wizIndex++; self.renderWizard(); document.querySelector('.wiz-body').scrollTop = 0; }
      else { self.save(); self.go('editor', self.project.id); }
    }

    inner.appendChild(foot);
    bodyWrap.appendChild(inner);
    wiz.appendChild(bodyWrap);
    root.appendChild(wiz);
  },

  /* Cevaba göre koşullu modül öner/ekle */
  reactToAnswer(secId, qid, val) {
    const p = this.project;
    const has = k => p.sections.some(s => s.id === k);
    const arr = Array.isArray(val) ? val : [val];
    let added = null;

    if (secId === 'identity' && qid === 'platforms') {
      if (arr.some(x => /iOS|Android/i.test(x)) && !has('mobile')) added = 'mobile';
      else if (arr.some(x => /VR/i.test(x)) && !has('vr')) added = 'vr';
    }
    if (secId === 'marketing' && qid === 'business') {
      if (/Free-to-play|Reklam|Abonelik/i.test(String(val)) && !has('monetization')) added = 'monetization';
    }
    if (secId === 'gameplay' && qid === 'progression') { /* yer tutucu */ }

    if (added) {
      const secs = window.Store.attachModule(p, 'conditional', added);
      if (secs.length) {
        this.save();
        this.toast('"' + secs[0].title + '" bölümü eklendi');
        // gezinmeyi tazele ama alanı kaybetme
        const nav = document.querySelector('.wiz-nav');
        if (nav) { const keep = this.wizIndex; this.wizIndex = keep; this.refreshWizNav(); }
      }
    }
  },

  refreshWizNav() {
    const nav = document.querySelector('.wiz-nav');
    if (!nav) return;
    const secs = this.activeSections();
    nav.innerHTML = '';
    nav.appendChild(el('div', 'nlabel', 'Bölümler'));
    secs.forEach((s, i) => {
      const st = window.Store.sectionStats(this.project, s);
      const done = st.total > 0 && st.filled === st.total;
      const b = el('button', 'nstep' + (i === this.wizIndex ? ' active' : '') + (done ? ' done' : ''));
      b.appendChild(el('span', 'dot', done ? '●' : (st.filled ? '◐' : '○')));
      b.appendChild(el('span', 'ntxt', s.title));
      b.addEventListener('click', () => { this.wizIndex = i; this.renderWizard(); });
      nav.appendChild(b);
    });
  },

  /* ================= EKRAN 3: DOKÜMAN EDİTÖRÜ ================= */
  renderEditor() {
    const root = document.getElementById('sc-editor');
    root.innerHTML = '';
    const p = this.project;
    const ed = el('div', 'ed' + (this.showPreview ? '' : ' nopreview') + (this.mobilePreview ? ' show-preview' : ''));
    const duzenlenebilir = window.Store.canEdit(p);

    /* --- sol: bölüm listesi --- */
    const nav = el('div', 'ed-nav');
    const list = el('div', 'navlist');
    p.sections.forEach((s, idx) => {
      const st = window.Store.sectionStats(p, s);
      const b = el('button', 'snav' + (s.id === this.activeSec ? ' active' : '') + (s.enabled ? '' : ' off'));
      b.draggable = duzenlenebilir;
      b.dataset.idx = idx;
      b.appendChild(el('span', 'hnd', '⠿'));
      b.appendChild(el('span', 'stxt', s.title));
      b.appendChild(el('span', 'cnt', st.filled + '/' + st.total));
      b.addEventListener('click', () => { this.activeSec = s.id; this.renderEditor(); });

      b.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', String(idx)); e.dataTransfer.effectAllowed = 'move'; });
      b.addEventListener('dragover', e => { e.preventDefault(); b.classList.add('drag-over'); });
      b.addEventListener('dragleave', () => b.classList.remove('drag-over'));
      b.addEventListener('drop', e => {
        e.preventDefault(); b.classList.remove('drag-over');
        const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (!isNaN(from) && from !== idx) {
          window.Store.moveSection(p, from, idx);
          this.save(); this.renderEditor();
        }
      });
      list.appendChild(b);
    });
    nav.appendChild(list);

    const nf = el('div', 'navfoot');
    const addSec = el('button', 'btn sm', '+ Bölüm ekle');
    addSec.addEventListener('click', () => {
      const t = prompt('Yeni bölüm adı:', 'Yeni Bölüm');
      if (t === null) return;
      const s = window.Store.addSection(p, t.trim() || 'Yeni Bölüm');
      this.activeSec = s.id; this.save(); this.renderEditor();
    });
    const addMod = el('button', 'btn sm', '+ Hazır modül');
    addMod.addEventListener('click', () => this.moduleModal());
    if (duzenlenebilir) {
      nf.appendChild(addSec);
      nf.appendChild(addMod);
    } else {
      nf.appendChild(el('div', 'fhint', '👁 Salt okunur — düzenleme yetkin yok'));
    }
    nav.appendChild(nf);
    ed.appendChild(nav);

    /* --- orta: form --- */
    const form = el('div', 'ed-form');
    const fi = el('div', 'ed-form-inner');
    const sec = p.sections.find(s => s.id === this.activeSec) || p.sections[0];
    if (sec) {
      this.activeSec = sec.id;
      const head = el('div', 'ed-head');
      const h2 = el('h2', null, sec.title);
      h2.contentEditable = duzenlenebilir ? 'true' : 'false'; h2.spellcheck = false;
      h2.addEventListener('blur', () => {
        const t = h2.textContent.trim();
        if (t && t !== sec.title) { sec.title = t; this.save(); this.renderEditor(); }
        else h2.textContent = sec.title;
      });
      h2.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); h2.blur(); } });
      head.appendChild(h2);

      const tog = el('button', 'btn sm', sec.enabled ? '◉ Dokümanda' : '○ Gizli');
      tog.title = 'Bu bölümü dokümana dahil et / etme';
      tog.addEventListener('click', () => { sec.enabled = !sec.enabled; this.save(); this.renderEditor(); });
      if (duzenlenebilir) head.appendChild(tog);

      const dels = el('button', 'btn sm danger', 'Bölümü sil');
      dels.addEventListener('click', () => {
        if (!confirm('"' + sec.title + '" bölümü ve içindeki cevaplar silinsin mi?')) return;
        window.Store.removeSection(p, sec.id);
        this.activeSec = (p.sections[0] || {}).id;
        this.save(); this.renderEditor(); this.toast('Bölüm silindi');
      });
      if (duzenlenebilir) head.appendChild(dels);
      fi.appendChild(head);
      if (sec.desc) fi.appendChild(el('div', 'sec-desc', sec.desc));
      else fi.appendChild(el('div', 'sec-desc', ' '));

      if (!sec.questions.length) {
        const e = el('div', 'empty');
        e.appendChild(el('div', 'big', 'BU BÖLÜMDE SORU YOK'));
        e.appendChild(el('div', 'sub', 'Aşağıdan yeni bir alan ekle.'));
        fi.appendChild(e);
      }

      sec.questions.forEach((q, qi) => {
        const controls = el('span', 'fid');
        const up = el('button', 'btn sm ghost', '↑'); up.title = 'Yukarı taşı';
        up.addEventListener('click', () => { window.Store.moveQuestion(p, sec.id, qi, qi - 1); this.save(); this.renderEditor(); });
        const dn = el('button', 'btn sm ghost', '↓'); dn.title = 'Aşağı taşı';
        dn.addEventListener('click', () => { window.Store.moveQuestion(p, sec.id, qi, qi + 1); this.save(); this.renderEditor(); });
        const rm = el('button', 'btn sm ghost', '×'); rm.title = 'Alanı sil';
        rm.addEventListener('click', () => {
          if (!confirm('"' + q.label + '" alanı ve cevabı silinsin mi?')) return;
          window.Store.removeQuestion(p, sec.id, q.id);
          this.save(); this.renderEditor();
        });
        controls.appendChild(up); controls.appendChild(dn); controls.appendChild(rm);

        const f = window.Fields.renderField(q, window.Store.getAnswer(p, sec.id, q.id), val => {
          if (!duzenlenebilir) return;
          window.Store.setAnswer(p, sec.id, q.id, val);
          this.save();
          this.refreshPreview();
          this.refreshCounts();
        }, { controls: duzenlenebilir ? controls : null, readonly: !duzenlenebilir });
        fi.appendChild(f);
      });

      if (duzenlenebilir) {
        const addq = el('button', 'btn sm', '+ Alan ekle');
        addq.addEventListener('click', () => this.addFieldModal(sec));
        fi.appendChild(addq);
      }
    }
    form.appendChild(fi);
    ed.appendChild(form);

    /* --- sağ: önizleme ---
     * Dar ekranda CSS gizler; .show-preview sınıfı sekme gibi öne alır.
     * Bu yüzden DOM'u her zaman üretiriz, yalnızca showPreview=false ise atlarız. */
    if (this.showPreview || this.isNarrow()) {
      const prev = el('div', 'ed-prev');
      const pi = el('div', 'ed-prev-inner');
      const doc = el('div', 'doc');
      doc.id = 'docPreview';
      doc.innerHTML = window.Exporters.toDocHTML(p, { toc: true });
      pi.appendChild(doc);
      prev.appendChild(pi);
      ed.appendChild(prev);
    }
    root.appendChild(ed);
    this.renderEditorToolbar();
  },

  renderEditorToolbar() {
    const bar = document.getElementById('toolbar');
    bar.innerHTML = '';
    if (!this.project) return;
    const p = this.project;
    const st = window.Store.stats(p);

    const prog = el('span', 'crumb');
    prog.innerHTML = '<b>%' + st.pct + '</b> dolu <span class="sep">·</span> ' + st.filled + '/' + st.total +
      (st.reqTotal ? ' <span class="sep">·</span> zorunlu ' + st.reqFilled + '/' + st.reqTotal : '');
    prog.id = 'progLabel';
    bar.appendChild(prog);

    const wiz = el('button', 'btn sm', 'Ankete dön');
    wiz.addEventListener('click', () => this.go('wizard', p.id));
    bar.appendChild(wiz);

    if (p.cloud && window.Store.isOwner(p)) {
      const sh = el('button', 'btn sm', '⇲ Paylaş');
      sh.addEventListener('click', () => this.paylasModal(p));
      bar.appendChild(sh);
    }
    if (p.cloud && p.role === 'viewer') {
      const ro = el('span', 'crumb', '👁 salt okunur');
      ro.title = 'Bu projede yalnızca görüntüleme yetkin var';
      bar.appendChild(ro);
    }

    if (this.isNarrow()) {
      // Dar ekran: form ↔ doküman sekmesi
      const tp = el('button', 'btn sm' + (this.mobilePreview ? ' primary' : ''),
                    this.mobilePreview ? '✎ Düzenle' : '▤ Dokümanı gör');
      tp.addEventListener('click', () => { this.mobilePreview = !this.mobilePreview; this.renderEditor(); });
      bar.appendChild(tp);
    } else {
      const tp = el('button', 'btn sm', this.showPreview ? '◧ Önizleme açık' : '◧ Önizleme kapalı');
      tp.addEventListener('click', () => { this.showPreview = !this.showPreview; this.renderEditor(); });
      bar.appendChild(tp);
    }

    const ex = el('button', 'btn sm primary', '↓ Dışa aktar');
    ex.addEventListener('click', () => this.exportModal());
    bar.appendChild(ex);
  },

  refreshPreview() {
    const d = document.getElementById('docPreview');
    if (d) d.innerHTML = window.Exporters.toDocHTML(this.project, { toc: true });
  },

  refreshCounts() {
    const st = window.Store.stats(this.project);
    const l = document.getElementById('progLabel');
    if (l) l.innerHTML = '<b>%' + st.pct + '</b> dolu <span class="sep">·</span> ' + st.filled + '/' + st.total +
      (st.reqTotal ? ' <span class="sep">·</span> zorunlu ' + st.reqFilled + '/' + st.reqTotal : '');
    const sec = this.project.sections.find(s => s.id === this.activeSec);
    if (sec) {
      const btn = Array.from(document.querySelectorAll('.snav')).find(b => b.querySelector('.stxt').textContent === sec.title);
      if (btn) {
        const s2 = window.Store.sectionStats(this.project, sec);
        btn.querySelector('.cnt').textContent = s2.filled + '/' + s2.total;
      }
    }
  },

  /* ---------- alan ekleme ---------- */
  addFieldModal(sec) {
    const { bg, body, foot } = this.modal('Alan ekle');
    const draft = { label: '', type: 'textarea', hint: '', options: [], cols: [] };

    const f1 = el('div', 'field');
    f1.appendChild(Object.assign(el('label', 'flabel'), { textContent: 'Soru / alan başlığı' }));
    const i1 = el('input'); i1.type = 'text'; i1.placeholder = 'Örn: Düşman davranış kuralları';
    i1.addEventListener('input', () => { draft.label = i1.value; ok.disabled = !draft.label.trim(); });
    f1.appendChild(i1); body.appendChild(f1);

    const f2 = el('div', 'field');
    f2.appendChild(Object.assign(el('label', 'flabel'), { textContent: 'Alan tipi' }));
    const sel = el('select');
    [['textarea', 'Uzun metin'], ['text', 'Kısa metin'], ['list', 'Madde listesi'],
     ['table', 'Tablo'], ['multi', 'Çoktan seçmeli (çoklu)'], ['select', 'Açılır liste'],
     ['tags', 'Etiketler'], ['number', 'Sayı'], ['scale', 'Ölçek 1-5']].forEach(([v, t]) => {
      const o = el('option', null, t); o.value = v; sel.appendChild(o);
    });
    sel.addEventListener('change', () => { draft.type = sel.value; paintExtra(); });
    f2.appendChild(sel); body.appendChild(f2);

    const extra = el('div'); body.appendChild(extra);
    function paintExtra() {
      extra.innerHTML = '';
      if (draft.type === 'table') {
        const f = el('div', 'field');
        f.appendChild(Object.assign(el('label', 'flabel'), { textContent: 'Sütun başlıkları (virgülle)' }));
        const i = el('input'); i.type = 'text'; i.placeholder = 'Ad, Açıklama, Öncelik';
        i.addEventListener('input', () => { draft.cols = i.value.split(',').map(s => s.trim()).filter(Boolean); });
        f.appendChild(i); extra.appendChild(f);
      } else if (draft.type === 'multi' || draft.type === 'select') {
        const f = el('div', 'field');
        f.appendChild(Object.assign(el('label', 'flabel'), { textContent: 'Seçenekler (virgülle)' }));
        const i = el('input'); i.type = 'text'; i.placeholder = 'Seçenek 1, Seçenek 2, Seçenek 3';
        i.addEventListener('input', () => { draft.options = i.value.split(',').map(s => s.trim()).filter(Boolean); });
        f.appendChild(i); extra.appendChild(f);
      }
    }
    paintExtra();

    const f3 = el('div', 'field');
    f3.appendChild(Object.assign(el('label', 'flabel'), { textContent: 'İpucu (isteğe bağlı)' }));
    const i3 = el('input'); i3.type = 'text'; i3.placeholder = 'Alanın altında görünen açıklama';
    i3.addEventListener('input', () => { draft.hint = i3.value; });
    f3.appendChild(i3); body.appendChild(f3);

    const cancel = el('button', 'btn', 'Vazgeç');
    cancel.addEventListener('click', () => bg.remove());
    const ok = el('button', 'btn primary', 'Ekle'); ok.disabled = true;
    ok.addEventListener('click', () => {
      if (draft.type === 'table' && !draft.cols.length) draft.cols = ['Ad', 'Açıklama'];
      if ((draft.type === 'multi' || draft.type === 'select') && !draft.options.length) {
        alert('Bu tip için en az bir seçenek gerekli.'); return;
      }
      window.Store.addQuestion(this.project, sec.id, draft);
      this.save(); bg.remove(); this.renderEditor(); this.toast('Alan eklendi');
    });
    foot.appendChild(cancel); foot.appendChild(ok);
    setTimeout(() => i1.focus(), 30);
  },

  /* ---------- hazır modül ekleme ---------- */
  moduleModal() {
    const { bg, body, foot } = this.modal('Hazır modül ekle', true);
    const p = this.project;
    const has = id => p.sections.some(s => s.id === id);

    body.appendChild(el('div', 'nlabel', 'TÜR MODÜLLERİ'));
    const g1 = el('div', 'genre-grid');
    Object.keys(S().GENRES).forEach(k => {
      const g = S().GENRES[k];
      const exists = g.sections.every(s => has(s.id));
      const b = el('button', 'gcard'); b.type = 'button'; b.disabled = exists;
      if (exists) b.style.opacity = '.35';
      b.appendChild(el('div', 'gicon', g.icon));
      b.appendChild(el('div', 'gname', g.label + (exists ? ' ✓' : '')));
      b.appendChild(el('div', 'gdesc', g.desc));
      b.addEventListener('click', () => {
        const added = window.Store.attachModule(p, 'genre', k);
        if (added.length) { this.activeSec = added[0].id; this.save(); bg.remove(); this.renderEditor(); this.toast(added.length + ' bölüm eklendi'); }
      });
      g1.appendChild(b);
    });
    body.appendChild(g1);

    body.appendChild(el('div', 'nlabel', 'EK MODÜLLER'));
    const g2 = el('div', 'genre-grid');
    Object.keys(S().CONDITIONAL).forEach(k => {
      const m = S().CONDITIONAL[k];
      const exists = has(m.id);
      const b = el('button', 'gcard'); b.type = 'button'; b.disabled = exists;
      if (exists) b.style.opacity = '.35';
      b.appendChild(el('div', 'gicon', '+'));
      b.appendChild(el('div', 'gname', m.title + (exists ? ' ✓' : '')));
      b.appendChild(el('div', 'gdesc', m.questions.length + ' soru'));
      b.addEventListener('click', () => {
        const added = window.Store.attachModule(p, 'conditional', k);
        if (added.length) { this.activeSec = added[0].id; this.save(); bg.remove(); this.renderEditor(); this.toast('"' + m.title + '" eklendi'); }
      });
      g2.appendChild(b);
    });
    body.appendChild(g2);

    const close = el('button', 'btn', 'Kapat');
    close.addEventListener('click', () => bg.remove());
    foot.appendChild(close);
  },

  /* ---------- dışa aktarma ---------- */
  exportModal() {
    const p = this.project;
    const { bg, body, foot } = this.modal('Dışa aktar');
    const base = window.Exporters.safeFile(window.Exporters.getTitle(p));

    let includeEmpty = false;
    const opt = el('div', 'field');
    const chips = el('div', 'chips');
    const c1 = el('button', 'chip', 'Boş alanları da yaz'); c1.type = 'button';
    c1.addEventListener('click', () => { includeEmpty = !includeEmpty; c1.classList.toggle('on', includeEmpty); });
    chips.appendChild(c1);
    opt.appendChild(chips);
    opt.appendChild(el('div', 'fhint', 'Varsayılan: sadece doldurulmuş alanlar dışa aktarılır.'));
    body.appendChild(opt);

    const grid = el('div', 'exp-grid');
    const mk = (name, desc, fn) => {
      const b = el('button', 'exp'); b.type = 'button';
      b.appendChild(el('span', 'en', name));
      b.appendChild(el('span', 'ed2', desc));
      b.addEventListener('click', () => { fn(); });
      grid.appendChild(b);
    };

    mk('MARKDOWN .md', 'Notion / GitHub / Obsidian için', () => {
      window.Exporters.download(base + '.md', window.Exporters.toMarkdown(p, { includeEmpty }), 'text/markdown');
      this.toast('Markdown indirildi');
    });
    mk('HTML .html', 'Tek dosya, paylaşılabilir, stilli', () => {
      window.Exporters.download(base + '.html', window.Exporters.toStandaloneHTML(p), 'text/html');
      this.toast('HTML indirildi');
    });
    mk('PDF', 'Yazdır penceresi → "PDF olarak kaydet"', () => { bg.remove(); this.printPDF(); });
    mk('JSON .json', 'Proje dosyası — geri yüklenebilir', () => {
      window.Exporters.download(base + '.json', JSON.stringify(p, null, 2), 'application/json');
      this.toast('Proje dosyası indirildi');
    });
    mk('DÜZ METİN .txt', 'Biçimsiz, her yere yapıştırılır', () => {
      window.Exporters.download(base + '.txt', window.Exporters.toText(p), 'text/plain');
      this.toast('Metin indirildi');
    });
    mk('BACKLOG .csv', 'Trello / Jira / Sheets görev listesi', () => {
      window.Exporters.download(base + '-backlog.csv', '\ufeff' + window.Exporters.toBacklogCSV(p), 'text/csv');
      this.toast('Backlog indirildi');
    });
    mk('PANOYA MARKDOWN', 'Kopyala, bir yere yapıştır', () => {
      const t = window.Exporters.toMarkdown(p, { includeEmpty });
      navigator.clipboard.writeText(t).then(() => this.toast('Markdown panoya kopyalandı'),
        () => { window.Exporters.download(base + '.md', t, 'text/markdown'); this.toast('Pano engellendi — dosya indirildi'); });
    });
    mk('YAZDIR', 'Doğrudan yazıcıya', () => { bg.remove(); this.printPDF(); });

    body.appendChild(grid);
    const close = el('button', 'btn', 'Kapat');
    close.addEventListener('click', () => bg.remove());
    foot.appendChild(close);
  },

  printPDF() {
    // Yazdırma, önizleme panelinin DOM'unu kullanır — yoksa geçici olarak üret.
    const wasHidden = !this.showPreview;
    const wasMobile = this.mobilePreview;
    if (wasHidden) { this.showPreview = true; }
    if (this.isNarrow()) { this.mobilePreview = true; }
    this.renderEditor();
    setTimeout(() => {
      window.print();
      this.showPreview = !wasHidden ? this.showPreview : false;
      this.mobilePreview = wasMobile;
      this.renderEditor();
    }, 150);
  },

  /* ---------- paylaşım ---------- */
  paylasModal(project) {
    const { bg, body, foot } = this.modal('Paylaş: ' + project.name, true);

    // Davet formu
    const f = el('div', 'field');
    f.appendChild(Object.assign(el('label', 'flabel'), { textContent: 'E-posta ile davet et' }));
    const satir = el('div', 'invite-row');
    const mail = el('input'); mail.type = 'email'; mail.placeholder = 'kisi@ornek.com';
    satir.appendChild(mail);
    const rol = el('select');
    [['editor', 'Düzenleyebilir'], ['viewer', 'Sadece görür']].forEach(([v, t]) => {
      const o = el('option', null, t); o.value = v; rol.appendChild(o);
    });
    satir.appendChild(rol);
    const gonder = el('button', 'btn primary', 'Davet et');
    satir.appendChild(gonder);
    f.appendChild(satir);
    f.appendChild(el('div', 'fhint',
      'Kişi kayıtlıysa proje anında listesine düşer. Değilse Google ile ilk girişinde otomatik eklenir.'));
    body.appendChild(f);

    const liste = el('div', 'member-list');
    body.appendChild(liste);

    const self = this;
    async function tazele() {
      liste.innerHTML = '';
      liste.appendChild(el('div', 'fhint', 'Yükleniyor…'));
      let uyeler = [];
      try { uyeler = await window.Cloud.members(project.id); }
      catch (e) { liste.innerHTML = ''; liste.appendChild(el('div', 'fhint', 'Üyeler alınamadı: ' + e.message)); return; }
      liste.innerHTML = '';
      liste.appendChild(el('div', 'nlabel', 'ERİŞİMİ OLANLAR'));
      uyeler.forEach(m => {
        const row = el('div', 'member');
        const sol = el('div', 'm-who');
        sol.appendChild(el('span', 'm-mail', m.email || '—'));
        if (m.full_name) sol.appendChild(el('span', 'm-name', m.full_name));
        if (m.pending) sol.appendChild(el('span', 'ptag', 'davet bekliyor'));
        row.appendChild(sol);

        if (m.role === 'owner') {
          row.appendChild(el('span', 'ptag', 'sahip'));
        } else if (m.pending) {
          row.appendChild(el('span', 'ptag', m.role === 'editor' ? 'düzenleyen' : 'izleyen'));
          const ip = el('button', 'btn sm ghost', 'İptal');
          ip.addEventListener('click', async () => {
            ip.disabled = true;
            try { await window.Cloud.cancelInvite(project.id, m.email); await tazele(); }
            catch (e) { ip.disabled = false; alert('İptal edilemedi: ' + e.message); }
          });
          row.appendChild(ip);
        } else {
          const sel = el('select', 'm-role');
          [['editor', 'Düzenleyebilir'], ['viewer', 'Sadece görür']].forEach(([v, t]) => {
            const o = el('option', null, t); o.value = v; sel.appendChild(o);
          });
          sel.value = m.role;
          sel.addEventListener('change', async () => {
            try { await window.Cloud.setRole(project.id, m.user_id, sel.value); self.toast('Yetki güncellendi'); }
            catch (e) { alert('Güncellenemedi: ' + e.message); await tazele(); }
          });
          row.appendChild(sel);
          const cik = el('button', 'btn sm ghost', '×'); cik.title = 'Erişimi kaldır';
          cik.addEventListener('click', async () => {
            if (!confirm(m.email + ' projeden çıkarılsın mı?')) return;
            try { await window.Cloud.removeMember(project.id, m.user_id); await tazele(); }
            catch (e) { alert('Çıkarılamadı: ' + e.message); }
          });
          row.appendChild(cik);
        }
        liste.appendChild(row);
      });
    }

    gonder.addEventListener('click', async () => {
      const e2 = mail.value.trim();
      if (!e2) { mail.focus(); return; }
      gonder.disabled = true; gonder.textContent = '…';
      try {
        const r = await window.Cloud.invite(project.id, e2, rol.value);
        mail.value = '';
        self.toast(r.email + ' — ' + r.durum);
        await tazele();
      } catch (e) {
        alert('Davet edilemedi: ' + e.message);
      } finally {
        gonder.disabled = false; gonder.textContent = 'Davet et';
      }
    });
    mail.addEventListener('keydown', e => { if (e.key === 'Enter') gonder.click(); });

    const kapat = el('button', 'btn', 'Kapat');
    kapat.addEventListener('click', () => bg.remove());
    foot.appendChild(kapat);
    tazele();
    setTimeout(() => mail.focus(), 40);
  },

  /* ---------- modal yardımcısı ---------- */
  modal(title, wide) {
    const bg = el('div', 'modal-bg');
    const m = el('div', 'modal' + (wide ? ' wide' : ''));
    const h = el('div', 'modal-h');
    h.appendChild(el('h3', null, title));
    const x = el('button', 'btn sm ghost', '×');
    x.addEventListener('click', () => bg.remove());
    h.appendChild(x);
    const body = el('div', 'modal-b');
    const foot = el('div', 'modal-f');
    m.appendChild(h); m.appendChild(body); m.appendChild(foot);
    bg.appendChild(m);
    bg.addEventListener('mousedown', e => { if (e.target === bg) bg.remove(); });
    document.body.appendChild(bg);
    return { bg, body, foot };
  }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
})();
