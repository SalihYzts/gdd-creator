# GDD Creator

Oyun tasarım dokümanı (GDD) **üretme aracı**. Tek bir dokümanı değil, birden çok proje yönetir: tür seçersin, sana o türe özel sorular sorar, cevaplarından dokümanı kurar — sonra bölüm/alan ekler, çıkarır, sıralarsın.

Kurulum yok. `index.html`'i tarayıcıda aç, yeter.

---

## Ne yapar

**1. Proje listesi** — Her GDD ayrı bir proje. Doluluk oranı, tür, son güncelleme kartta görünür.

**2. Akıllı anket** — 18 tür (platformer, RPG, roguelike, nişancı, bulmaca, strateji, metroidvania, hayatta kalma, korku, görsel roman, yarış, dövüş, simülasyon, kart, ritim, sandbox, idle, diğer). Seçtiğin türe göre farklı sorular gelir: roguelike seçersen run süresi ve prosedürel üretim; dövüş seçersen kadro ve frame data sorulur.

Bazı bölümler cevabına göre **kendiliğinden açılır**:
- Platformlarda iOS/Android → *Mobil Özel Konular*
- Platformlarda VR → *VR / XR*
- İş modeli F2P/reklam/abonelik → *Monetizasyon*

**3. Doküman editörü** — Solda bölümler (sürükle-bırak sıralama), ortada form, sağda canlı önizleme.
- Bölüm ekle / sil / yeniden adlandır / gizle (gizli bölüm dokümana girmez ama cevapları durur)
- Alan ekle / sil / yukarı-aşağı taşı — 9 alan tipi (uzun metin, kısa metin, liste, tablo, çoklu seçim, açılır liste, etiket, sayı, ölçek)
- Hazır modül ekle: sonradan ikinci bir tür modülü ya da Erişilebilirlik / Çok Oyunculu gibi ek bölümler

**4. Çıktılar**

| Format | Ne için |
|---|---|
| Markdown `.md` | Notion, GitHub, Obsidian |
| HTML `.html` | Tek dosya, stilli, paylaşılabilir |
| PDF | Yazdır → "PDF olarak kaydet" |
| JSON `.json` | Proje dosyası — geri yüklenebilir, ekip arkadaşına gönderilir |
| Düz metin `.txt` | Biçimsiz, her yere yapışır |
| Backlog `.csv` | Trello / Jira / Sheets görev listesi |
| Panoya kopyala | Markdown olarak |

---

## Kullanım

```bash
# Doğrudan aç
xdg-open index.html

# Ya da yerel sunucuyla (dosya:// kısıtları olmadan)
python3 -m http.server 8477
# → http://localhost:8477
```

### Kısayollar
- `Ctrl/Cmd + S` — kaydet (zaten otomatik kaydeder)
- `Ctrl/Cmd + E` — dışa aktarma penceresi
- `Esc` — pencereyi kapat
- Liste/tablo alanlarında `Enter` — yeni satır, `Backspace` (boşken) — satır sil

---

## Hesap ve paylaşım

**Giriş yapmadan:** her şey tarayıcıda (`localStorage`). Sunucuya bir şey gitmez, internet gerekmez. Tarayıcı verilerini silersen projeler gider — JSON olarak dışa aktar.

**Giriş yapınca:** projeler Supabase'de saklanır, her cihazdan erişilir. Yerelde proje varsa "hesabına taşı" diye sorar.

**Davet:** Projeyi aç → **⇲ Paylaş** → e-posta + yetki. Kişi kayıtlıysa proje anında listesine düşer; değilse ilk girişinde otomatik eklenir.

| | Sahip | Düzenleyen | İzleyen |
|---|---|---|---|
| Görüntüle / dışa aktar | ✓ | ✓ | ✓ |
| Düzenle | ✓ | ✓ | — |
| Davet et / yetki değiştir | ✓ | — | — |
| Projeyi sil | ✓ | — | — |

İzleyende alanlar gerçekten kilitli (readOnly + disabled) **ve** Postgres RLS sunucu tarafında da engeller — tarayıcıdan zorlansa bile yazamaz.

Yayına alma adımları: `docs/YAYINA-ALMA.md`

---

## Ürün sınırı

Bu bir **araç**, bir GDD örneği değil. Uygulama boş proje listesiyle açılır; içindeki hiçbir oyun içeriği ürünün parçası değildir — hepsi senin girdiğin veridir. Şemadaki sorular (`js/schema.js`) veridir, kod değil: yeni bir tür ya da soru eklemek için o dosyaya bir nesne eklemen yeter.

**Yapmadığı şeyler:** yapay zekâ ile içerik üretmez (sorular senin düşünmen için), bulut senkronizasyonu ve çok kullanıcılı eş zamanlı düzenleme yoktur, sürüm geçmişi tutmaz.

---

## Dosya yapısı

```
gdd-creator/
├── index.html          uygulama kabuğu
├── css/app.css         tema, düzen, yazdırma ve dar ekran kuralları
├── js/
│   ├── config.js       Supabase anahtarları (Vercel'de build.js üretir)
│   ├── schema.js       SORULAR — 18 tür, 11 çekirdek bölüm, 5 ek modül (205 soru)
│   ├── cloud.js        Supabase: auth, projeler, davetler, roller
│   ├── store.js        proje modeli + localStorage/bulut + yazma kuyruğu
│   ├── fields.js       9 alan tipini DOM'a çeviren render motoru
│   ├── export.js       Markdown / HTML / TXT / CSV / PDF üreticileri
│   └── app.js          ekranlar, yönlendirme, editör, paylaşım, dışa aktarma
├── supabase/schema.sql veritabanı şeması + RLS politikaları
├── tests/
│   ├── test.html       38 yerel test
│   ├── cloud-test.html 49 bulut testi (sahte sunucu, RLS taklidi)
│   └── ui-demo.html    arayüzü sahte sunucuyla sürmek için
└── tools/              geliştirme araçları (CDP sürücü, RLS testi, şema kurulumu)
```

## Testler

Üç katman, toplam 111 test:

```bash
# 1. Yerel mantık (38 test) — tarayıcıda aç
tests/test.html

# 2. Bulut mantığı (49 test) — sahte Supabase, RLS taklidi dahil
tests/cloud-test.html

# 3. Gerçek RLS (24 test) — asıl güvenlik sınırı, canlı sunucuda
SUPABASE_PAT=sbp_... python3 tools/rls_test.py
```

Tarayıcı testleri gerçek projelerini **kirletmez** (başta `localStorage`'ı yedekler, sonunda geri yükler). RLS testi kendi test kullanıcılarını kullanır; `tools/temizle.py` artıkları siler.

Sahte sunucu testleri istemci mantığını doğrular, gerçek RLS testi asıl güvenlik sınırını. İkisi de gerekli: sahte sunucu bir keresinde nesneyi referansla paylaştığı için gerçek bir istemci hatasını gizlemişti — bu yüzden artık ağ gibi JSON kopyası döndürüyor.

## Yeni tür eklemek

`js/schema.js` içinde `GENRES` nesnesine ekle:

```js
tower_defense: {
  label: 'Kule Savunma', icon: '⌂',
  desc: 'Dalga tasarımı, kule dengesi.',
  sections: [{
    id: 'g_td', title: 'Kule & Dalga Tasarımı',
    questions: [
      { id: 'towers', label: 'Kuleler', type: 'table',
        cols: ['Kule', 'Rol', 'Maliyet'], required: true },
      { id: 'waves', label: 'Dalga yapısı', type: 'textarea',
        hint: 'Kaç dalga, zorluk artışı nasıl?' }
    ]
  }]
}
```

Kod değişikliği gerekmez — tür seçicide, modül listesinde ve ankette kendiliğinden çıkar.
