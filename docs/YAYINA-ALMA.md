# Yayına Alma — Adım Adım

Kod tarafı hazır. Kalan: iki hesap açmak ve üç değeri yerine koymak. Yaklaşık 15 dakika.

---

## 1. Supabase projesi aç (hesap + veritabanı)

1. [supabase.com](https://supabase.com) → **Start your project** → GitHub ile giriş yap
2. **New project**
   - Name: `gdd-creator`
   - Database password: güçlü bir şifre üret, **bir yere kaydet** (sonra lazım olmayacak ama kaybetme)
   - Region: `Central EU (Frankfurt)` — Türkiye'ye en yakını
3. Proje hazır olana kadar ~2 dakika bekle.

### Şemayı kur

Sol menü → **SQL Editor** → **New query** → `supabase/schema.sql` dosyasının **tamamını** yapıştır → **Run**.

"Success. No rows returned" görmelisin. Bu dosya tekrar çalıştırılabilir — hata alırsan düzeltip yeniden çalıştırabilirsin.

### Google girişini aç

1. Sol menü → **Authentication** → **Sign In / Providers** → **Google** → aç (Enable)
2. Burada **Callback URL (for OAuth)** yazıyor, onu kopyala. Şuna benzer:
   `https://xxxxx.supabase.co/auth/v1/callback`
3. Şimdi Google tarafı: [console.cloud.google.com](https://console.cloud.google.com)
   - Üstten **New Project** → adı `gdd-creator` → Create
   - Sol menü → **APIs & Services** → **OAuth consent screen**
     - User Type: **External** → Create
     - App name: `GDD Creator`, destek e-postası: kendi Gmail'in
     - Save and Continue → Scopes'ta bir şey ekleme → Save → Back to Dashboard
     - **Publish app** de (yoksa sadece test kullanıcıları girebilir)
   - Sol menü → **Credentials** → **Create Credentials** → **OAuth client ID**
     - Application type: **Web application**
     - Name: `GDD Creator Web`
     - **Authorized redirect URIs** → ADD URI → 2. adımda kopyaladığın Supabase callback URL'ini yapıştır
     - Create
   - Çıkan **Client ID** ve **Client Secret**'ı kopyala
4. Supabase'e dön → Google sağlayıcısına bu ikisini yapıştır → **Save**

### Anahtarları al

Sol menü → **Project Settings** → **API**:
- **Project URL** → `https://xxxxx.supabase.co`
- **anon / public** anahtarı → `eyJhbG...` ile başlayan uzun metin

> `service_role` anahtarını **asla** alma, hiçbir yere yazma. O sunucu anahtarı.

---

## 2. Vercel'e yayınla

1. [vercel.com](https://vercel.com) → **Sign Up** → **Continue with GitHub**
2. **Add New** → **Project** → `SalihYzts/gdd-creator` deposunu **Import**
3. Ayarlara dokunma (vercel.json zaten doğru), ama **Environment Variables** kısmına iki değişken ekle:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | Supabase Project URL |
   | `SUPABASE_ANON_KEY` | anon / public anahtar |

4. **Deploy** → 1 dakika. Adresin: `https://gdd-creator-xxx.vercel.app`

### Google'a canlı adresi tanıt

Site yayına girince Supabase'e dön:
- **Authentication** → **URL Configuration**
- **Site URL**: `https://gdd-creator-xxx.vercel.app` (Vercel'in verdiği adres)
- **Redirect URLs** → ekle: `https://gdd-creator-xxx.vercel.app/**`
- Save

Bu olmadan giriş yapınca yanlış adrese yönlenir.

---

## 3. Yerelde denemek istersen

`js/config.js` dosyasını aç, iki değeri yaz:

```js
window.GDD_CONFIG = {
  SUPABASE_URL: 'https://xxxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbG...'
};
```

Sonra Supabase → Authentication → URL Configuration → Redirect URLs'e `http://127.0.0.1:8477/**` ekle.

> Bu dosya depoda boş değerlerle duruyor. Elle doldurursan **commit etme** — ya da anahtarları `js/config.local.js`'e koy (gitignore'da).

---

## 4. Taslağını geri yükle

Kurtardığım dosya: `_yedek/taslaklar/project-yer-kapmaca-20260916.json`

Canlı sitede giriş yap → **↑ JSON içe aktar** → bu dosyayı seç. Proje hesabına yüklenir.

---

## Nasıl çalışıyor (kısa)

**Giriş yapmadan:** her şey tarayıcıda (localStorage), eskisi gibi.

**Giriş yapınca:** projeler Supabase'e taşınır. Yerelde proje varsa "hesabına taşı" diye sorar — kabul edersen taşır ve yerelden siler, etmezsen ikisi de durur.

**Davet:** Projeyi aç → **⇲ Paylaş** → e-posta yaz, yetki seç (Düzenleyebilir / Sadece görür) → Davet et.
- Kişi kayıtlıysa proje anında listesine düşer.
- Kayıtlı değilse davet bekler; o kişi Google ile ilk girişinde otomatik eklenir.

**Yetkiler:**
| | Sahip | Düzenleyen | İzleyen |
|---|---|---|---|
| Görüntüle / dışa aktar | ✓ | ✓ | ✓ |
| Düzenle | ✓ | ✓ | — |
| Davet et / yetki değiştir | ✓ | — | — |
| Projeyi sil | ✓ | — | — |

İzleyen için form alanları gerçekten kilitlidir (sadece görsel değil) ve sunucu tarafında RLS ile de engellenir — tarayıcıdan zorlasa bile yazamaz.

---

## Sorun çıkarsa

**"Giriş yapınca localhost'a atıyor"** → Supabase → Authentication → URL Configuration → Site URL'i Vercel adresin yap.

**"Google giriş ekranında 'uygulama doğrulanmadı' uyarısı"** → OAuth consent screen'de **Publish app** demedin. Test aşamasında "Advanced → Go to GDD Creator" ile geçebilirsin.

**"Projeler görünmüyor"** → Tarayıcı konsolunu aç (F12). RLS hatası varsa `schema.sql`'i tekrar çalıştır.

**"Davet ettim ama gelmedi"** → Sistem e-posta göndermiyor; kişiye linki sen ver. O Google ile girince proje otomatik listesine düşer.
