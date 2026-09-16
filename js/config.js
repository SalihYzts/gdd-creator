/* GDD Creator — Yapılandırma
 *
 * Supabase anahtarlarını buraya yaz. Bunlar GİZLİ DEĞİL:
 * anon key tarayıcıya gitmek üzere tasarlanmıştır, güvenlik RLS ile sağlanır
 * (bkz. supabase/schema.sql). Yine de service_role anahtarını ASLA buraya koyma.
 *
 * Boş bırakırsan uygulama tamamen yerel çalışır — giriş ekranı çıkmaz.
 */
window.GDD_CONFIG = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: ''
};
