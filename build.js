#!/usr/bin/env node
/* Vercel derleme adımı: ortam değişkenlerinden js/config.js üretir.
 *
 * Neden: anon key herkese açık olsa da (güvenlik RLS'te), depoya gömmek yerine
 * Vercel ortam değişkeninde tutmak projeyi taşınabilir kılar — anahtarı
 * değiştirmek için kod değiştirmek gerekmez.
 *
 * Değişken yoksa config.js'e dokunmaz; uygulama yerel kipte açılır.
 */
const fs = require('fs');
const path = require('path');

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const hedef = path.join(__dirname, 'js', 'config.js');

if (!url || !key) {
  console.log('[build] SUPABASE_URL / SUPABASE_ANON_KEY yok — yerel kip yapılandırması korunuyor.');
  process.exit(0);
}

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url.trim())) {
  console.warn('[build] UYARI: SUPABASE_URL beklenen biçimde değil:', url);
}
if (key.trim().startsWith('eyJ') === false && key.trim().startsWith('sb_') === false) {
  console.warn('[build] UYARI: anon key beklenen biçimde değil.');
}
if (/service_role/.test(key)) {
  console.error('[build] DUR: service_role anahtarı istemciye konulamaz. Anon key kullan.');
  process.exit(1);
}

const icerik = `/* GDD Creator — Yapılandırma (derleme sırasında üretildi, elle düzenleme)
 * Kaynak: Vercel ortam değişkenleri SUPABASE_URL / SUPABASE_ANON_KEY
 * anon key gizli değildir; güvenlik supabase/schema.sql içindeki RLS ile sağlanır.
 */
window.GDD_CONFIG = {
  SUPABASE_URL: ${JSON.stringify(url.trim().replace(/\/$/, ''))},
  SUPABASE_ANON_KEY: ${JSON.stringify(key.trim())}
};
`;

fs.writeFileSync(hedef, icerik, 'utf8');
console.log('[build] js/config.js üretildi →', url.trim());
