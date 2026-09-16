/* GDD Creator — Bulut katmanı (Supabase)
 *
 * Tasarım kararı: uygulama bulut OLMADAN da tam çalışır.
 * Cloud.enabled false ise her şey localStorage'da kalır ve giriş arayüzü çıkmaz.
 *
 * Roller:
 *   owner  — her şey + davet + silme
 *   editor — düzenler
 *   viewer — sadece okur
 */
(function () {
'use strict';

const cfg = window.GDD_CONFIG || {};
let sb = null;            // supabase istemcisi
let session = null;       // aktif oturum
let profile = null;       // { id, email, full_name, avatar_url }
const listeners = [];

const Cloud = {
  get enabled() { return !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase); },
  get user() { return session ? session.user : null; },
  get profile() { return profile; },
  get signedIn() { return !!session; },

  onChange(fn) { listeners.push(fn); },
  _emit() { listeners.forEach(f => { try { f(); } catch (e) { console.error(e); } }); },

  async init() {
    if (!this.enabled) return false;
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const { data } = await sb.auth.getSession();
    session = data.session || null;
    if (session) await this._afterSignIn();

    sb.auth.onAuthStateChange(async (event, s) => {
      const oncekiId = session && session.user ? session.user.id : null;
      session = s || null;
      if (session && session.user.id !== oncekiId) await this._afterSignIn();
      if (!session) profile = null;
      this._emit();
    });
    return true;
  },

  async _afterSignIn() {
    const u = session.user;
    profile = {
      id: u.id,
      email: u.email,
      full_name: (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || u.email,
      avatar_url: u.user_metadata && u.user_metadata.avatar_url
    };
    // Bekleyen davetleri üyeliğe çevir
    try { await sb.rpc('accept_my_invites'); }
    catch (e) { console.warn('Davetler işlenemedi:', e.message); }
  },

  async signInWithGoogle() {
    if (!this.enabled) throw new Error('Bulut yapılandırılmamış');
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: location.origin + location.pathname }
    });
    if (error) throw error;
  },

  /* E-posta + şifre ile kayıt.
   * Supabase'de "Confirm email" açıksa oturum dönmez, doğrulama maili gider. */
  async signUpWithEmail(email, password, fullName) {
    if (!this.enabled) throw new Error('Bulut yapılandırılmamış');
    const { data, error } = await sb.auth.signUp({
      email: String(email).trim(),
      password: password,
      options: {
        data: { full_name: fullName || String(email).split('@')[0] },
        emailRedirectTo: location.origin + location.pathname
      }
    });
    if (error) throw error;
    return { session: data.session, dogrulamaGerekli: !data.session };
  },

  async signInWithEmail(email, password) {
    if (!this.enabled) throw new Error('Bulut yapılandırılmamış');
    const { data, error } = await sb.auth.signInWithPassword({
      email: String(email).trim(), password: password
    });
    if (error) throw error;
    return data.session;
  },

  async resetPassword(email) {
    if (!this.enabled) throw new Error('Bulut yapılandırılmamış');
    const { error } = await sb.auth.resetPasswordForEmail(String(email).trim(), {
      redirectTo: location.origin + location.pathname
    });
    if (error) throw error;
  },

  async signOut() {
    if (!sb) return;
    await sb.auth.signOut();
    session = null; profile = null;
    this._emit();
  },

  /* ---------- PROJELER ---------- */

  /* Bulut projelerini uygulama modeline çevirir. */
  _toLocal(row, role) {
    const d = row.data || {};
    return {
      id: row.id,
      cloud: true,
      role: role || 'owner',
      ownerId: row.owner_id,
      schemaVersion: d.schemaVersion || 1,
      name: row.name,
      genre: row.genre || d.genre || 'other',
      extras: d.extras || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      sections: d.sections || [],
      answers: d.answers || {}
    };
  },

  async list() {
    if (!this.signedIn) return [];
    const { data: rows, error } = await sb
      .from('projects')
      .select('id, owner_id, name, genre, data, created_at, updated_at')
      .order('updated_at', { ascending: false });
    if (error) { console.error('Projeler alınamadı:', error); throw error; }

    const { data: mems } = await sb
      .from('project_members')
      .select('project_id, role')
      .eq('user_id', session.user.id);
    const rolMap = {};
    (mems || []).forEach(m => { rolMap[m.project_id] = m.role; });

    return (rows || []).map(r =>
      this._toLocal(r, r.owner_id === session.user.id ? 'owner' : (rolMap[r.id] || 'viewer')));
  },

  async get(id) {
    if (!this.signedIn) return null;
    const { data, error } = await sb.from('projects').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    let role = data.owner_id === session.user.id ? 'owner' : 'viewer';
    if (role !== 'owner') {
      const { data: m } = await sb.from('project_members')
        .select('role').eq('project_id', id).eq('user_id', session.user.id).maybeSingle();
      if (m) role = m.role;
    }
    return this._toLocal(data, role);
  },

  async create(project) {
    if (!this.signedIn) throw new Error('Giriş gerekli');
    const { data, error } = await sb.from('projects').insert({
      owner_id: session.user.id,
      name: project.name,
      genre: project.genre,
      data: {
        schemaVersion: project.schemaVersion || 1,
        extras: project.extras || [],
        sections: project.sections || [],
        answers: project.answers || {}
      }
    }).select().single();
    if (error) throw error;
    return this._toLocal(data, 'owner');
  },

  /* İstemcide üretilmiş id ile yaratır — böylece Store önbelleği anında
   * doğru id'yi taşır ve sonraki save'ler güncelleme olur (iyimser yazma). */
  async createWithId(project) {
    if (!this.signedIn) throw new Error('Giriş gerekli');
    const { data, error } = await sb.from('projects').insert({
      id: project.id,
      owner_id: session.user.id,
      name: project.name,
      genre: project.genre,
      data: {
        schemaVersion: project.schemaVersion || 1,
        extras: project.extras || [],
        sections: project.sections || [],
        answers: project.answers || {}
      }
    }).select().single();
    if (error) throw error;
    project.ownerId = data.owner_id;
    project.createdAt = data.created_at;
    project.updatedAt = data.updated_at;
    return project;
  },

  async save(project) {
    if (!this.signedIn) throw new Error('Giriş gerekli');
    if (project.role === 'viewer') throw new Error('Bu projede düzenleme yetkin yok');
    const { data, error } = await sb.from('projects').update({
      name: project.name,
      genre: project.genre,
      data: {
        schemaVersion: project.schemaVersion || 1,
        extras: project.extras || [],
        sections: project.sections || [],
        answers: project.answers || {}
      }
    }).eq('id', project.id).select().single();
    if (error) throw error;
    project.updatedAt = data.updated_at;
    return project;
  },

  async remove(id) {
    if (!this.signedIn) throw new Error('Giriş gerekli');
    const { error } = await sb.from('projects').delete().eq('id', id);
    if (error) throw error;
  },

  /* ---------- ÜYELER & DAVETLER ---------- */

  async members(projectId) {
    if (!this.signedIn) return [];
    const { data, error } = await sb.rpc('project_members_detail', { p_project: projectId });
    if (error) { console.error('Üyeler alınamadı:', error); return []; }
    return data || [];
  },

  async invite(projectId, email, role) {
    if (!this.signedIn) throw new Error('Giriş gerekli');
    const temiz = String(email).trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(temiz)) throw new Error('Geçerli bir e-posta yaz');
    if (temiz === (session.user.email || '').toLowerCase()) throw new Error('Kendini davet edemezsin');

    // Zaten kayıtlıysa doğrudan üye yap
    const { data: p } = await sb.from('profiles').select('id, email').ilike('email', temiz).maybeSingle();
    if (p) {
      const { error } = await sb.from('project_members')
        .upsert({ project_id: projectId, user_id: p.id, role }, { onConflict: 'project_id,user_id' });
      if (error) throw error;
      // Davet kaydını da tut (kimin davet ettiği görünsün)
      await sb.from('invites').upsert({
        project_id: projectId, email: temiz, role,
        invited_by: session.user.id, accepted_at: new Date().toISOString()
      }, { onConflict: 'project_id,email' });
      return { durum: 'eklendi', email: temiz };
    }

    // Kayıtlı değil: davet bekletilir, ilk girişinde otomatik kabul olur
    const { error } = await sb.from('invites').upsert({
      project_id: projectId, email: temiz, role, invited_by: session.user.id, accepted_at: null
    }, { onConflict: 'project_id,email' });
    if (error) throw error;
    return { durum: 'davet edildi', email: temiz };
  },

  async setRole(projectId, userId, role) {
    const { error } = await sb.from('project_members')
      .update({ role }).eq('project_id', projectId).eq('user_id', userId);
    if (error) throw error;
  },

  async removeMember(projectId, userId) {
    const { error } = await sb.from('project_members')
      .delete().eq('project_id', projectId).eq('user_id', userId);
    if (error) throw error;
  },

  async cancelInvite(projectId, email) {
    const { error } = await sb.from('invites')
      .delete().eq('project_id', projectId).ilike('email', String(email).toLowerCase());
    if (error) throw error;
  },

  /* ---------- YERELDEN BULUTA TAŞIMA ---------- */

  /* Giriş yapıldığında yerel projeleri buluta yükler.
   * Yerel kopyayı SİLMEZ — kullanıcı onaylayana kadar iki yerde durur. */
  async migrateLocal(localProjects) {
    if (!this.signedIn) throw new Error('Giriş gerekli');
    const sonuc = [];
    for (const p of localProjects) {
      try {
        // Yerel id'ler uuid değil; buluta yeni uuid ile gider.
        const kopya = JSON.parse(JSON.stringify(p));
        kopya.id = window.uuid();
        kopya.cloud = true;
        kopya.role = 'owner';
        await this.createWithId(kopya);
        sonuc.push({ ad: p.name, yerelId: p.id, id: kopya.id, ok: true });
      } catch (e) {
        sonuc.push({ ad: p.name, yerelId: p.id, ok: false, hata: e.message });
      }
    }
    return sonuc;
  }
};

window.Cloud = Cloud;
})();
