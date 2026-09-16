/* GDD Creator — Soru Şeması
 * Bu dosya ÜRÜNÜN verisidir, örnek bir oyunun içeriği değildir.
 * Yapı:
 *   SECTION = { id, title, desc, questions[] }
 *   QUESTION = { id, label, type, hint, placeholder, options[], cols[], required }
 * Tipler: text | textarea | select | multi | tags | number | scale | list | table
 */

(function () {
'use strict';
const Q = {
  // ---------- 1. KÜNYE ----------
  identity: {
    id: 'identity',
    title: 'Künye',
    desc: 'Projenin kimlik bilgileri. Dokümanın kapağını bu bölüm oluşturur.',
    questions: [
      { id: 'title', label: 'Oyunun adı', type: 'text', required: true,
        placeholder: 'Çalışma adı da olabilir', hint: 'Kesinleşmediyse "(çalışma adı)" ekle.' },
      { id: 'tagline', label: 'Tek cümlelik tanım (logline)', type: 'textarea', required: true,
        placeholder: 'X oyuncusu, Y yaparak Z hedefine ulaşır.',
        hint: 'Yayıncıya 10 saniyede anlatacağın cümle. Tür + eylem + hedef içersin.' },
      { id: 'platforms', label: 'Hedef platformlar', type: 'multi', required: true,
        options: ['PC (Steam)', 'PC (itch.io)', 'PC (Epic)', 'Mac', 'Linux', 'iOS', 'Android', 'Nintendo Switch', 'PlayStation', 'Xbox', 'Web (HTML5)', 'VR', 'Retro / Handheld'] },
      { id: 'engine', label: 'Motor / teknoloji', type: 'select',
        options: ['Unity', 'Unreal Engine', 'Godot', 'GameMaker', 'Bevy', 'Löve2D', 'Phaser', 'Construct', 'Kendi motorumuz', 'Henüz belirlenmedi'] },
      { id: 'teamsize', label: 'Ekip büyüklüğü', type: 'select',
        options: ['Tek kişi', '2-3 kişi', '4-10 kişi', '10-30 kişi', '30+'] },
      { id: 'duration', label: 'Hedeflenen geliştirme süresi', type: 'select',
        options: ['Game jam (< 1 hafta)', '1-3 ay', '3-6 ay', '6-12 ay', '1-2 yıl', '2+ yıl'] },
      { id: 'version', label: 'Doküman sürümü', type: 'text', placeholder: 'v0.1' },
      { id: 'authors', label: 'Hazırlayan(lar)', type: 'tags', placeholder: 'İsim yazıp Enter' }
    ]
  },

  // ---------- 2. VİZYON ----------
  vision: {
    id: 'vision',
    title: 'Vizyon & Konsept',
    desc: 'Oyunun neden var olduğu. Kapsam tartışmalarında hakem olarak bu bölüme dönülür.',
    questions: [
      { id: 'pillars', label: 'Tasarım sütunları', type: 'list', required: true,
        placeholder: 'Örn: "Her ölüm bir şey öğretir"',
        hint: '3 tane yaz. Bir özellik bu sütunlardan birine hizmet etmiyorsa kapsam dışıdır.' },
      { id: 'fantasy', label: 'Oyuncuya vaat edilen fantezi', type: 'textarea',
        placeholder: 'Oyuncu kendini ne hissedecek?',
        hint: '"Yetenekli bir suikastçı" gibi bir duygu; mekanik değil.' },
      { id: 'hook', label: 'Ayırt edici kanca (USP)', type: 'textarea', required: true,
        hint: 'Bu oyunu rakiplerinden ayıran tek şey. Mağaza sayfasının ilk GIF\'i ne olacak?' },
      { id: 'refs', label: 'Referans oyunlar', type: 'table',
        cols: ['Oyun', 'Neyi alıyoruz', 'Neyi almıyoruz'],
        hint: 'Sadece isim listelemek işe yaramaz; ne aldığını yaz.' },
      { id: 'tone', label: 'Ton', type: 'multi',
        options: ['Ciddi', 'Mizahi', 'Karanlık', 'Melankolik', 'Sakin / huzurlu', 'Gergin', 'Epik', 'İronik', 'Çocuksu', 'Grotesk'] },
      { id: 'elevator', label: '"X buluşuyor Y ile" formülü', type: 'text',
        placeholder: 'Hades buluşuyor Stardew Valley ile' }
    ]
  },

  // ---------- 3. HEDEF KİTLE & PAZAR ----------
  audience: {
    id: 'audience',
    title: 'Hedef Kitle & Pazar',
    desc: 'Kime satıyorsun ve nerede bulacaksın.',
    questions: [
      { id: 'audience', label: 'Birincil hedef kitle', type: 'textarea', required: true,
        placeholder: 'Yaş, oyun alışkanlığı, hangi oyunları oynuyor',
        hint: '"Herkes" cevabı hiç kimse demektir.' },
      { id: 'rating', label: 'Yaş derecelendirmesi hedefi', type: 'select',
        options: ['PEGI 3 / E', 'PEGI 7 / E10+', 'PEGI 12 / T', 'PEGI 16 / M', 'PEGI 18 / AO'] },
      { id: 'session', label: 'Tipik oturum süresi', type: 'select',
        options: ['< 5 dk (mikro)', '5-15 dk', '15-45 dk', '45-90 dk', '90 dk+'] },
      { id: 'playtime', label: 'Toplam oynanış süresi hedefi', type: 'text', placeholder: '6-8 saat ana hikâye' },
      { id: 'competitors', label: 'Doğrudan rakipler', type: 'list', placeholder: 'Oyun adı — neden rakip' },
      { id: 'languages', label: 'Desteklenecek diller', type: 'tags', placeholder: 'Türkçe, İngilizce...' }
    ]
  },

  // ---------- 4. OYNANIŞ ----------
  gameplay: {
    id: 'gameplay',
    title: 'Oynanış',
    desc: 'Oyuncunun saniye saniye ne yaptığı.',
    questions: [
      { id: 'coreloop', label: 'Çekirdek döngü', type: 'textarea', required: true,
        placeholder: 'Keşfet → Çatış → Ödül topla → Güçlen → Keşfet',
        hint: 'Oyuncunun defalarca tekrarladığı en küçük tam tur. Oklarla yaz.' },
      { id: 'metaloop', label: 'Meta döngü (uzun vadeli ilerleyiş)', type: 'textarea',
        placeholder: 'Oturumlar arası kalıcı ilerleme nedir?' },
      { id: 'verbs', label: 'Oyuncu fiilleri', type: 'list', required: true,
        placeholder: 'Koş, zıpla, kap, fırlat...',
        hint: 'Oyuncunun yapabildiği her temel eylem. Bu liste kontrol şemasına dönüşür.' },
      { id: 'winlose', label: 'Kazanma ve kaybetme koşulları', type: 'textarea', required: true },
      { id: 'perspective', label: 'Kamera / bakış açısı', type: 'select',
        options: ['2D yandan', '2D üstten', '2.5D', 'İzometrik', '3D birinci şahıs', '3D üçüncü şahıs', 'Sabit kamera', 'Top-down 3D'] },
      { id: 'difficulty', label: 'Zorluk yaklaşımı', type: 'select',
        options: ['Tek zorluk, dengeli', 'Seçilebilir zorluk kademeleri', 'Dinamik zorluk (oyuncuya uyum)', 'Kasıtlı olarak zor', 'Erişilebilirlik seçenekleriyle esnetilebilir'] },
      { id: 'controls', label: 'Kontrol şeması', type: 'table',
        cols: ['Eylem', 'Klavye/Fare', 'Gamepad'] },
      { id: 'progression', label: 'İlerleme sistemi', type: 'multi',
        options: ['Seviye atlama', 'Yetenek ağacı', 'Ekipman', 'Bölüm açma', 'Hikâye ilerlemesi', 'Oyuncu becerisi (mekanik yok)', 'Zanaat / crafting', 'Reputasyon'] }
    ]
  },

  // ---------- 5. MEKANİKLER ----------
  mechanics: {
    id: 'mechanics',
    title: 'Mekanikler & Sistemler',
    desc: 'Sistemlerin tek tek dökümü. Üretimde en çok bu bölüme bakılır.',
    questions: [
      { id: 'systems', label: 'Sistem listesi', type: 'table', required: true,
        cols: ['Sistem', 'Ne yapar', 'Öncelik (M/S/C)'],
        hint: 'M=Olmazsa olmaz, S=Olmalı, C=Olursa güzel. Kapsam kesildiğinde C\'ler gider.' },
      { id: 'economy', label: 'Kaynaklar & ekonomi', type: 'table',
        cols: ['Kaynak', 'Nasıl kazanılır', 'Nerede harcanır'] },
      { id: 'failure', label: 'Başarısızlık sonrası ne olur?', type: 'textarea',
        hint: 'Ölüm cezası, geri yükleme noktası, kaybedilen ilerleme.' },
      { id: 'tutorial', label: 'Öğretme yaklaşımı', type: 'select',
        options: ['Metinli öğretici', 'Tasarımla öğretme (metin yok)', 'Kademeli mekanik açılımı', 'Sandbox/serbest keşif', 'Yardım menüsü'] },
      { id: 'balance', label: 'Denge hedefleri / sayısal iskelet', type: 'textarea',
        placeholder: 'Oyuncu canı, hasar aralıkları, süreler...' }
    ]
  },

  // ---------- 6. HİKÂYE ----------
  narrative: {
    id: 'narrative',
    title: 'Hikâye & Dünya',
    desc: 'Anlatı katmanı. Hikâyesiz oyunlarda bu bölüm çıkarılabilir.',
    optional: true,
    questions: [
      { id: 'premise', label: 'Ana öncül', type: 'textarea' },
      { id: 'setting', label: 'Dünya / mekân', type: 'textarea', placeholder: 'Zaman, yer, atmosfer' },
      { id: 'characters', label: 'Karakterler', type: 'table',
        cols: ['İsim', 'Rol', 'Motivasyon', 'Oyuncuyla ilişkisi'] },
      { id: 'structure', label: 'Anlatı yapısı', type: 'select',
        options: ['Doğrusal', 'Dallanan (seçimler)', 'Çevresel anlatı (metinsiz)', 'Bölümlü / episodik', 'Ortaya karışık (emergent)'] },
      { id: 'beats', label: 'Ana olay örgüsü adımları', type: 'list', placeholder: 'Açılış, ilk dönüm noktası...' },
      { id: 'delivery', label: 'Anlatım araçları', type: 'multi',
        options: ['Ara sahneler', 'Diyalog', 'Seslendirme', 'Notlar / günlükler', 'Çevre tasarımı', 'Barks (anlık replikler)', 'Çizgi roman paneller'] }
    ]
  },

  // ---------- 7. SANAT ----------
  art: {
    id: 'art',
    title: 'Sanat Yönetimi',
    desc: 'Görsel kimlik ve üretim standartları.',
    questions: [
      { id: 'style', label: 'Sanat stili', type: 'select', required: true,
        options: ['Pixel art', 'El çizimi 2D', 'Vektörel / flat', 'Low-poly 3D', 'Stilize 3D', 'Gerçekçi 3D', 'Voxel', 'Kolaj / karışık teknik', 'ASCII / metin'] },
      { id: 'palette', label: 'Renk paleti yaklaşımı', type: 'textarea', placeholder: 'Hâkim renkler, kontrast kuralı' },
      { id: 'resolution', label: 'Teknik standartlar', type: 'text', placeholder: '320x180 iç çözünürlük / 32px tile / 4K texture' },
      { id: 'animation', label: 'Animasyon yaklaşımı', type: 'textarea', placeholder: 'FPS, iskelet mi frame mi, kaç poz' },
      { id: 'ui_style', label: 'Arayüz stili', type: 'textarea', placeholder: 'Diegetik mi, minimal HUD mu, font tercihi' },
      { id: 'assetlist', label: 'Asset kategorileri ve tahmini adet', type: 'table',
        cols: ['Kategori', 'Adet', 'Not'] }
    ]
  },

  // ---------- 8. SES ----------
  audio: {
    id: 'audio',
    title: 'Ses & Müzik',
    desc: 'Duygunun yarısı buradan gelir.',
    questions: [
      { id: 'music_dir', label: 'Müzik yönü', type: 'textarea', placeholder: 'Tür, enstrümantasyon, referans besteciler' },
      { id: 'adaptive', label: 'Uyarlanabilir müzik var mı?', type: 'select',
        options: ['Hayır, sabit parçalar', 'Katmanlı (yoğunluğa göre)', 'Dikey remix', 'Yatay geçiş', 'Prosedürel'] },
      { id: 'sfx', label: 'Ses efekti öncelikleri', type: 'list', placeholder: 'En kritik 5 ses' },
      { id: 'vo', label: 'Seslendirme', type: 'select',
        options: ['Yok', 'Anlamsız sesler (gibberish)', 'Kısmi (ana sahneler)', 'Tam seslendirme'] },
      { id: 'audio_tech', label: 'Ses teknolojisi', type: 'select',
        options: ['Motorun kendi sistemi', 'FMOD', 'Wwise', 'Belirlenmedi'] }
    ]
  },

  // ---------- 9. TEKNİK ----------
  tech: {
    id: 'tech',
    title: 'Teknik Tasarım',
    desc: 'Mühendislik kısıtları ve hedefleri.',
    questions: [
      { id: 'target_spec', label: 'Minimum donanım hedefi', type: 'textarea', placeholder: 'CPU/GPU/RAM veya cihaz modeli' },
      { id: 'perf', label: 'Performans hedefleri', type: 'text', placeholder: '60 FPS @1080p, < 3 sn yükleme' },
      { id: 'save', label: 'Kayıt sistemi', type: 'select',
        options: ['Otomatik kayıt', 'Manuel kayıt yuvaları', 'Kontrol noktası', 'Kayıt yok (tek oturum)', 'Bulut senkronizasyonu'] },
      { id: 'thirdparty', label: 'Üçüncü parti bağımlılıklar', type: 'list', placeholder: 'Eklenti / SDK / kütüphane' },
      { id: 'pipeline', label: 'Üretim hattı & araçlar', type: 'textarea', placeholder: 'Sürüm kontrolü, build otomasyonu, asset hattı' },
      { id: 'risks_tech', label: 'Teknik riskler', type: 'table', cols: ['Risk', 'Etki', 'Önlem'] }
    ]
  },

  // ---------- 10. ÜRETİM ----------
  production: {
    id: 'production',
    title: 'Kapsam & Üretim',
    desc: 'Gerçekle temas noktası. Boş bırakılırsa proje kayar.',
    questions: [
      { id: 'mvp', label: 'MVP tanımı', type: 'textarea', required: true,
        hint: 'Oynanabilir sayılması için gereken minimum. Bundan azı prototip değildir.' },
      { id: 'milestones', label: 'Kilometre taşları', type: 'table',
        cols: ['Aşama', 'İçerik', 'Hedef tarih'] },
      { id: 'outofscope', label: 'KAPSAM DIŞI', type: 'list', required: true,
        placeholder: 'Yapılmayacak şeyler',
        hint: 'Bu listeyi yazmak, yapılacaklar listesini yazmaktan daha değerlidir.' },
      { id: 'team_roles', label: 'Roller ve sorumluluklar', type: 'table', cols: ['Rol', 'Kişi', 'Sorumluluk'] },
      { id: 'budget', label: 'Bütçe / kaynak notu', type: 'textarea', placeholder: 'Para, asset satın alma, dış kaynak' },
      { id: 'risks', label: 'Proje riskleri', type: 'table', cols: ['Risk', 'Olasılık', 'Plan B'] }
    ]
  },

  // ---------- 11. PAZARLAMA ----------
  marketing: {
    id: 'marketing',
    title: 'Yayın & Pazarlama',
    desc: 'Oyun bittiğinde değil, başladığında düşünülür.',
    optional: true,
    questions: [
      { id: 'business', label: 'İş modeli', type: 'select',
        options: ['Premium (tek seferlik ücret)', 'Free-to-play', 'Demo + premium', 'Erken erişim', 'Abonelik', 'Reklam destekli', 'Ücretsiz / portföy'] },
      { id: 'price', label: 'Fiyat hedefi', type: 'text', placeholder: '$9.99' },
      { id: 'capsule', label: 'Mağaza sayfası kancası', type: 'textarea', placeholder: 'Steam kısa açıklaması' },
      { id: 'channels', label: 'Tanıtım kanalları', type: 'multi',
        options: ['Steam Next Fest', 'itch.io', 'TikTok', 'X / Twitter', 'YouTube / yayıncılar', 'Discord topluluğu', 'Reddit', 'Basın / gazeteciler', 'Fuarlar', 'Bluesky'] },
      { id: 'kpi', label: 'Başarı ölçütleri', type: 'list', placeholder: 'Wishlist sayısı, D1 retention...' }
    ]
  }
};

/* ---------- KOŞULLU MODÜLLER ----------
 * Bir cevaba bağlı olarak dokümana eklenir.
 */
const CONDITIONAL = {
  multiplayer: {
    id: 'multiplayer',
    title: 'Çok Oyunculu & Ağ',
    desc: 'Çok oyunculu seçildiği için eklendi.',
    questions: [
      { id: 'mp_mode', label: 'Çok oyunculu modu', type: 'multi',
        options: ['Yerel co-op', 'Çevrimiçi co-op', 'PvP', 'Asenkron', 'MMO', 'Split-screen', 'Hot-seat'] },
      { id: 'mp_count', label: 'Oyuncu sayısı', type: 'text', placeholder: '2-4' },
      { id: 'netcode', label: 'Ağ mimarisi', type: 'select',
        options: ['P2P', 'Adanmış sunucu', 'Listen server', 'Rollback netcode', 'Lockstep', 'Belirlenmedi'] },
      { id: 'matchmaking', label: 'Eşleştirme & lobi', type: 'textarea' },
      { id: 'cheat', label: 'Hile ve suistimal önlemi', type: 'textarea' }
    ]
  },
  monetization: {
    id: 'monetization',
    title: 'Monetizasyon & Ekonomi',
    desc: 'F2P / reklam / abonelik seçildiği için eklendi.',
    questions: [
      { id: 'mon_model', label: 'Gelir kalemleri', type: 'multi',
        options: ['Kozmetik', 'Battle pass', 'Reklam (ödüllü)', 'Reklam (banner)', 'Enerji / bekleme', 'DLC', 'Loot box', 'Bahşiş / destek'] },
      { id: 'currency', label: 'Sanal para yapısı', type: 'table', cols: ['Para birimi', 'Nasıl kazanılır', 'Nasıl satın alınır'] },
      { id: 'fairness', label: 'Adalet ilkesi', type: 'textarea',
        hint: 'Pay-to-win sınırını nerede çiziyorsun?' },
      { id: 'ltv', label: 'Hedef metrikler', type: 'text', placeholder: 'ARPU, dönüşüm oranı, retention' }
    ]
  },
  mobile: {
    id: 'mobile',
    title: 'Mobil Özel Konular',
    desc: 'Mobil platform seçildiği için eklendi.',
    questions: [
      { id: 'touch', label: 'Dokunmatik kontrol tasarımı', type: 'textarea', placeholder: 'Sanal joystick, tap, swipe, tek el' },
      { id: 'orientation', label: 'Ekran yönü', type: 'select', options: ['Dikey', 'Yatay', 'Her ikisi'] },
      { id: 'device_range', label: 'Cihaz aralığı', type: 'text', placeholder: 'Android 9+, 3GB RAM' },
      { id: 'offline', label: 'Çevrimdışı oynanabilirlik', type: 'select', options: ['Tam çevrimdışı', 'Kısmen', 'Sürekli bağlantı gerekli'] },
      { id: 'store_req', label: 'Mağaza gereksinimleri', type: 'textarea', placeholder: 'APK boyutu, izinler, yaş sınırı' }
    ]
  },
  vr: {
    id: 'vr',
    title: 'VR / XR Özel Konular',
    desc: 'VR platformu seçildiği için eklendi.',
    questions: [
      { id: 'locomotion', label: 'Hareket sistemi', type: 'multi',
        options: ['Teleport', 'Smooth locomotion', 'Oda ölçeği', 'Sabit / oturarak', 'Tırmanma'] },
      { id: 'comfort', label: 'Konfor önlemleri', type: 'textarea', placeholder: 'Vignette, snap turn, hareket hastalığı' },
      { id: 'hands', label: 'Etkileşim modeli', type: 'select', options: ['Kumanda', 'El takibi', 'Her ikisi'] },
      { id: 'vr_perf', label: 'VR performans bütçesi', type: 'text', placeholder: '72/90 Hz, draw call bütçesi' }
    ]
  },
  accessibility: {
    id: 'accessibility',
    title: 'Erişilebilirlik',
    desc: 'Erişilebilirlik odağı işaretlendiği için eklendi.',
    questions: [
      { id: 'a11y_visual', label: 'Görsel erişilebilirlik', type: 'multi',
        options: ['Renk körlüğü modları', 'Ölçeklenebilir arayüz', 'Yüksek kontrast', 'Ekran sarsıntısı kapatma', 'Yazı tipi seçenekleri'] },
      { id: 'a11y_audio', label: 'İşitsel erişilebilirlik', type: 'multi',
        options: ['Altyazı', 'Konuşmacı etiketi', 'Görsel ses ipuçları', 'Ayrı ses kanalları'] },
      { id: 'a11y_motor', label: 'Motor erişilebilirlik', type: 'multi',
        options: ['Tuş yeniden atama', 'Tek el modu', 'Hold yerine toggle', 'QTE kapatma', 'Otomatik nişan yardımı'] },
      { id: 'a11y_cog', label: 'Bilişsel erişilebilirlik', type: 'textarea', placeholder: 'Zorluk ayarı, hedef göstergesi, okuma hızı' }
    ]
  }
};

/* ---------- TÜR MODÜLLERİ ---------- */
const GENRES = {
  platformer: {
    label: 'Platform Oyunu', icon: '▞',
    desc: 'Zıplama, hassas kontrol, seviye tasarımı.',
    sections: [{
      id: 'g_platformer', title: 'Platform Mekaniği',
      questions: [
        { id: 'jump_feel', label: 'Zıplama hissi', type: 'textarea', required: true,
          placeholder: 'Zıplama yüksekliği, yerçekimi, hava kontrolü',
          hint: 'Bu oyunun tamamı bu paragrafta gizli. Sayı ver.' },
        { id: 'forgiveness', label: 'Affedicilik mekanikleri', type: 'multi',
          options: ['Coyote time', 'Jump buffer', 'Duvar sıçraması toleransı', 'Corner correction', 'Yok, katı kontrol'] },
        { id: 'moveset', label: 'Hareket repertuvarı', type: 'list', placeholder: 'Dash, duvar zıplaması, çift zıplama...' },
        { id: 'level_struct', label: 'Seviye yapısı', type: 'select',
          options: ['Doğrusal bölümler', 'Dünya haritası', 'Açık seviye (Metroidvania)', 'Tek ekran odalar', 'Sonsuz koşu', 'Prosedürel'] },
        { id: 'level_count', label: 'Seviye sayısı ve süresi', type: 'text', placeholder: '24 seviye x 2-3 dk' },
        { id: 'hazards', label: 'Tehlike ve engel çeşitleri', type: 'list' },
        { id: 'collectibles', label: 'Toplanabilirler', type: 'table', cols: ['Tür', 'Amaç', 'Adet'] }
      ]
    }]
  },

  rpg: {
    label: 'RPG', icon: '⚔',
    desc: 'Karakter gelişimi, istatistikler, görevler.',
    sections: [{
      id: 'g_rpg', title: 'RPG Sistemleri',
      questions: [
        { id: 'combat_type', label: 'Savaş sistemi', type: 'select', required: true,
          options: ['Sıra tabanlı', 'Aktif zaman (ATB)', 'Gerçek zamanlı aksiyon', 'Taktiksel ızgara', 'Duraklatmalı gerçek zamanlı', 'Savaş yok'] },
        { id: 'stats', label: 'İstatistikler', type: 'table', cols: ['İstatistik', 'Neyi etkiler', 'Başlangıç değeri'] },
        { id: 'classes', label: 'Sınıflar / arketipler', type: 'table', cols: ['Sınıf', 'Rol', 'Ayırt edici yetenek'] },
        { id: 'party', label: 'Parti yapısı', type: 'select',
          options: ['Tek karakter', '2-3 kişilik parti', '4-6 kişilik parti', 'Değiştirilebilir kadro', 'Toplanabilir birlikler'] },
        { id: 'quests', label: 'Görev yapısı', type: 'textarea', placeholder: 'Ana görev + yan görev dağılımı, adet' },
        { id: 'loot', label: 'Ekipman & ganimet', type: 'textarea', placeholder: 'Nadirlik kademeleri, drop oranları' },
        { id: 'dialogue', label: 'Diyalog ve seçim sistemi', type: 'textarea', placeholder: 'Seçimler sonucu değiştiriyor mu?' },
        { id: 'leveling', label: 'Seviye eğrisi', type: 'textarea', placeholder: 'Maks seviye, XP formülü' }
      ]
    }]
  },

  roguelike: {
    label: 'Roguelike / Roguelite', icon: '⁂',
    desc: 'Prosedürel üretim, kalıcı ölüm, run tabanlı.',
    sections: [{
      id: 'g_rogue', title: 'Run Yapısı & Prosedürel Üretim',
      questions: [
        { id: 'run_length', label: 'Bir run ne kadar sürer?', type: 'text', required: true, placeholder: '20-30 dk' },
        { id: 'permadeath', label: 'Ölüm modeli', type: 'select', required: true,
          options: ['Tam kalıcı ölüm (roguelike)', 'Meta ilerlemeli (roguelite)', 'Kısmi kayıp', 'Tekrar deneme hakkı'] },
        { id: 'meta_prog', label: 'Kalıcı ilerleme', type: 'textarea', placeholder: 'Runlar arası ne birikir?' },
        { id: 'procgen', label: 'Prosedürel üretilen şeyler', type: 'multi',
          options: ['Harita düzeni', 'Düşman yerleşimi', 'Eşyalar', 'Olaylar', 'Patronlar', 'Hikâye parçaları', 'Hiçbiri (elle tasarım)'] },
        { id: 'handcraft', label: 'Elle tasarlanan içerik', type: 'textarea',
          hint: 'Tamamen rastgele oyunlar sıkıcı olur. Ne elle tasarlanacak?' },
        { id: 'builds', label: 'Build çeşitliliği', type: 'textarea', placeholder: 'Sinerji sistemi, eşya sayısı' },
        { id: 'unlocks', label: 'Açılabilirler', type: 'table', cols: ['Açılan şey', 'Koşul', 'Etki'] },
        { id: 'seed', label: 'Seed / günlük meydan okuma', type: 'select', options: ['Var', 'Yok', 'Planlanıyor'] }
      ]
    }]
  },

  shooter: {
    label: 'Nişancı (FPS/TPS)', icon: '◎',
    desc: 'Silah hissi, çatışma tasarımı, yapay zekâ.',
    sections: [{
      id: 'g_shooter', title: 'Çatışma & Silah Tasarımı',
      questions: [
        { id: 'gunfeel', label: 'Silah hissi', type: 'textarea', required: true,
          placeholder: 'Geri tepme, ekran sarsıntısı, ses, isabet geri bildirimi' },
        { id: 'weapons', label: 'Silah listesi', type: 'table', cols: ['Silah', 'Rol', 'Hasar/Atış hızı'] },
        { id: 'ttk', label: 'Öldürme süresi (TTK)', type: 'text', placeholder: '0.4 sn' },
        { id: 'enemy_ai', label: 'Düşman yapay zekâsı', type: 'textarea', placeholder: 'Davranış ağacı, siper alma, kuşatma' },
        { id: 'arena', label: 'Çatışma alanı tasarımı ilkeleri', type: 'textarea', placeholder: 'Siper yoğunluğu, yükseklik, kaçış yolları' },
        { id: 'ammo', label: 'Mühimmat & kaynak ekonomisi', type: 'textarea' },
        { id: 'movement_sh', label: 'Hareket sistemi', type: 'multi',
          options: ['Sprint', 'Kayma (slide)', 'Duvar koşusu', 'Grapple', 'Siper sistemi', 'Yavaş / taktiksel', 'Bunny hop'] }
      ]
    }]
  },

  puzzle: {
    label: 'Bulmaca', icon: '▦',
    desc: 'Mekanik keşfi, zorluk eğrisi, çözüm alanı.',
    sections: [{
      id: 'g_puzzle', title: 'Bulmaca Tasarımı',
      questions: [
        { id: 'core_mech', label: 'Çekirdek bulmaca mekaniği', type: 'textarea', required: true,
          hint: 'Tek bir mekanik olmalı. Geri kalan her şey onun varyasyonu.' },
        { id: 'variations', label: 'Mekanik varyasyonları', type: 'list', placeholder: 'Her yeni eleman bir varyasyon' },
        { id: 'curve', label: 'Zorluk eğrisi planı', type: 'textarea', placeholder: 'Tanıt → Geliştir → Birleştir → Ters çevir' },
        { id: 'puzzle_count', label: 'Bulmaca sayısı', type: 'text', placeholder: '60 bulmaca, 4 bölüm' },
        { id: 'hints', label: 'İpucu sistemi', type: 'select',
          options: ['İpucu yok', 'Kademeli ipucu', 'Bulmaca atlama', 'Otomatik yardım (takılınca)', 'Topluluk çözümleri'] },
        { id: 'aha', label: '"Aha!" anları', type: 'list', placeholder: 'Oyuncunun keşfetmesi gereken içgörüler' },
        { id: 'undo', label: 'Geri alma / sıfırlama', type: 'select', options: ['Sınırsız geri al', 'Sadece sıfırla', 'Geri alma yok', 'Zamanı geri sarma'] }
      ]
    }]
  },

  strategy: {
    label: 'Strateji', icon: '♜',
    desc: 'Kaynak yönetimi, birimler, karar derinliği.',
    sections: [{
      id: 'g_strategy', title: 'Strateji Sistemleri',
      questions: [
        { id: 'strat_type', label: 'Strateji alt türü', type: 'select', required: true,
          options: ['Gerçek zamanlı (RTS)', 'Sıra tabanlı (TBS)', 'Taktiksel (XCOM tarzı)', '4X', 'Kule savunma', 'Grand strategy', 'Otomasyon / fabrika'] },
        { id: 'units', label: 'Birimler', type: 'table', cols: ['Birim', 'Rol', 'Maliyet', 'Karşıtı'] },
        { id: 'resources', label: 'Kaynak ekonomisi', type: 'table', cols: ['Kaynak', 'Üretim', 'Tüketim'] },
        { id: 'tech_tree', label: 'Teknoloji / bina ağacı', type: 'textarea' },
        { id: 'ai_opponent', label: 'Rakip yapay zekâ', type: 'textarea', placeholder: 'Zorluk seviyeleri, hile kullanıyor mu?' },
        { id: 'map_design', label: 'Harita tasarımı', type: 'textarea', placeholder: 'Boyut, simetri, kontrol noktaları' },
        { id: 'turn_len', label: 'Tur / maç süresi', type: 'text', placeholder: '30-45 dk maç' }
      ]
    }]
  },

  metroidvania: {
    label: 'Metroidvania', icon: '⌘',
    desc: 'Bağlı harita, yetenek kapıları, geri dönüş.',
    sections: [{
      id: 'g_mv', title: 'Harita & Yetenek Kapıları',
      questions: [
        { id: 'abilities', label: 'Yetenekler ve açtıkları', type: 'table', required: true,
          cols: ['Yetenek', 'Neyi açar', 'Kazanma yeri'] },
        { id: 'map_regions', label: 'Bölgeler', type: 'table', cols: ['Bölge', 'Tema', 'Zorluk'] },
        { id: 'gating', label: 'Kapı (gate) felsefesi', type: 'textarea', placeholder: 'Sert kapı mı, beceriyle aşılabilir mi?' },
        { id: 'backtrack', label: 'Geri dönüşü keyifli kılma', type: 'textarea', placeholder: 'Kısayol, hızlı seyahat, yeni içerik' },
        { id: 'sequence', label: 'Sıra kırma (sequence break)', type: 'select',
          options: ['Kasıtlı olarak destekleniyor', 'Tolere ediliyor', 'Engellendi'] },
        { id: 'bosses', label: 'Patronlar', type: 'table', cols: ['Patron', 'Mekanik', 'Ödül'] }
      ]
    }]
  },

  survival: {
    label: 'Hayatta Kalma / Craft', icon: '⛏',
    desc: 'Kaynak toplama, üretim, tehdit yönetimi.',
    sections: [{
      id: 'g_survival', title: 'Hayatta Kalma Sistemleri',
      questions: [
        { id: 'needs', label: 'İhtiyaç göstergeleri', type: 'multi', required: true,
          options: ['Açlık', 'Susuzluk', 'Sıcaklık', 'Uyku', 'Akıl sağlığı', 'Hastalık', 'Oksijen', 'Radyasyon'] },
        { id: 'crafting', label: 'Üretim (crafting) sistemi', type: 'textarea', placeholder: 'Tarif sayısı, kademe yapısı, iş istasyonları' },
        { id: 'base', label: 'Üs kurma', type: 'select',
          options: ['Serbest inşa', 'Izgara tabanlı', 'Önceden tanımlı yerler', 'Üs yok'] },
        { id: 'threats', label: 'Tehditler', type: 'table', cols: ['Tehdit', 'Ne zaman', 'Karşı önlem'] },
        { id: 'daycycle', label: 'Gün/gece & mevsim döngüsü', type: 'textarea' },
        { id: 'death_pen', label: 'Ölüm cezası', type: 'textarea', placeholder: 'Eşya kaybı, mezar, yeniden doğma' },
        { id: 'world_size', label: 'Dünya boyutu ve üretimi', type: 'text', placeholder: '4km² elle tasarım / sonsuz prosedürel' }
      ]
    }]
  },

  horror: {
    label: 'Korku', icon: '☠',
    desc: 'Gerilim eğrisi, tehdit, atmosfer.',
    sections: [{
      id: 'g_horror', title: 'Korku Tasarımı',
      questions: [
        { id: 'fear_type', label: 'Korku türü', type: 'multi', required: true,
          options: ['Psikolojik', 'Jump scare', 'Kozmik / varoluşsal', 'Body horror', 'Takip / kovalama', 'Kaynak kıtlığı gerilimi', 'Folk horror'] },
        { id: 'threat', label: 'Ana tehdit', type: 'textarea', placeholder: 'Ne kovalıyor? Öldürülebilir mi?' },
        { id: 'tension', label: 'Gerilim eğrisi', type: 'textarea',
          hint: 'Sürekli korku, korkuyu öldürür. Nefes alma anlarını yaz.' },
        { id: 'player_power', label: 'Oyuncu gücü', type: 'select',
          options: ['Tamamen savunmasız', 'Saklanabilir', 'Sınırlı savunma', 'Silahlı ama kıt mühimmat', 'Güçlü (aksiyon-korku)'] },
        { id: 'sound_design', label: 'Ses tasarımı rolü', type: 'textarea', placeholder: 'Sessizlik kullanımı, 3D ses, ipuçları' },
        { id: 'sanity', label: 'Akıl sağlığı / stres mekaniği', type: 'select', options: ['Var', 'Yok'] }
      ]
    }]
  },

  vn: {
    label: 'Görsel Roman / Anlatı', icon: '✎',
    desc: 'Dallanan hikâye, karakterler, sonlar.',
    sections: [{
      id: 'g_vn', title: 'Anlatı Yapısı',
      questions: [
        { id: 'branch', label: 'Dallanma yapısı', type: 'select', required: true,
          options: ['Doğrusal', 'Dallanan ve birleşen', 'Tam ağaç', 'Hub tabanlı', 'Zaman döngüsü'] },
        { id: 'endings', label: 'Sonlar', type: 'table', cols: ['Son', 'Koşul', 'Ton'] },
        { id: 'wordcount', label: 'Tahmini kelime sayısı', type: 'text', placeholder: '60.000 kelime' },
        { id: 'routes', label: 'Rotalar / karakter yolları', type: 'list' },
        { id: 'choice_weight', label: 'Seçimlerin ağırlığı', type: 'textarea', placeholder: 'Anlık mı, birikimli mi, gizli sayaç mı?' },
        { id: 'sprites', label: 'Karakter görsel ihtiyacı', type: 'table', cols: ['Karakter', 'Poz sayısı', 'İfade sayısı'] },
        { id: 'backlog', label: 'Okuma kolaylıkları', type: 'multi',
          options: ['Geri okuma (backlog)', 'Atlama (skip)', 'Otomatik ilerleme', 'Hızlı kayıt', 'Metin hızı ayarı'] }
      ]
    }]
  },

  racing: {
    label: 'Yarış', icon: '⟿',
    desc: 'Araç hissi, pist tasarımı, yarış yapısı.',
    sections: [{
      id: 'g_racing', title: 'Yarış Sistemleri',
      questions: [
        { id: 'handling', label: 'Sürüş modeli', type: 'select', required: true,
          options: ['Arcade', 'Simülasyon', 'Sim-cade', 'Drift odaklı', 'Fiziksiz / ray üzerinde'] },
        { id: 'vehicles', label: 'Araçlar', type: 'table', cols: ['Araç', 'Sınıf', 'Ayırt edici özellik'] },
        { id: 'tracks', label: 'Pistler', type: 'table', cols: ['Pist', 'Tema', 'Uzunluk'] },
        { id: 'race_modes', label: 'Yarış modları', type: 'multi',
          options: ['Turnuva', 'Zamana karşı', 'Eleme', 'Serbest sürüş', 'Drift puanı', 'Silahlı yarış', 'Hayalet yarış'] },
        { id: 'rubber', label: 'Denge yardımı (rubber banding)', type: 'select', options: ['Var', 'Yok', 'Sadece kolay zorlukta'] },
        { id: 'tuning', label: 'Araç geliştirme / ayar', type: 'textarea' }
      ]
    }]
  },

  fighting: {
    label: 'Dövüş', icon: '✊',
    desc: 'Kadro, frame data, giriş sistemi.',
    sections: [{
      id: 'g_fighting', title: 'Dövüş Sistemi',
      questions: [
        { id: 'fight_type', label: 'Alt tür', type: 'select', required: true,
          options: ['2D klasik', '3D arena', 'Platform dövüş (Smash tarzı)', 'Tag team', 'Arena brawler'] },
        { id: 'roster', label: 'Kadro', type: 'table', cols: ['Karakter', 'Arketip', 'Ayırt edici mekanik'] },
        { id: 'inputs', label: 'Giriş sistemi', type: 'select',
          options: ['Klasik hareket girişleri (QCF vb.)', 'Basitleştirilmiş', 'Tek tuş özel hareket', 'Karışık'] },
        { id: 'systems_f', label: 'Sistem mekanikleri', type: 'multi',
          options: ['Kombo', 'Blok / parry', 'Süper ölçer', 'Burst', 'Roman cancel', 'Grab / throw', 'Hava kombosu'] },
        { id: 'framedata', label: 'Frame data felsefesi', type: 'textarea', placeholder: 'Startup/active/recovery aralıkları' },
        { id: 'training', label: 'Antrenman ve öğrenme araçları', type: 'multi',
          options: ['Training mode', 'Kombo denemeleri', 'Frame data görüntüleyici', 'Replay analizi', 'Öğretici'] }
      ]
    }]
  },

  simulation: {
    label: 'Simülasyon / Yönetim', icon: '⚙',
    desc: 'Sistem derinliği, ekonomi, otomasyon.',
    sections: [{
      id: 'g_sim', title: 'Simülasyon Sistemleri',
      questions: [
        { id: 'sim_subject', label: 'Neyi simüle ediyor?', type: 'text', required: true, placeholder: 'Çiftlik, şehir, hastane, fabrika...' },
        { id: 'sim_entities', label: 'Simüle edilen varlıklar', type: 'table', cols: ['Varlık', 'Davranış', 'İhtiyaçları'] },
        { id: 'sim_econ', label: 'Ekonomi modeli', type: 'textarea', placeholder: 'Gelir, gider, denge noktası' },
        { id: 'time_ctrl', label: 'Zaman kontrolü', type: 'multi', options: ['Duraklat', 'Hızlandır', 'Gerçek zamanlı', 'Tur tabanlı', 'Geri sar'] },
        { id: 'sim_fail', label: 'Başarısızlık durumu', type: 'textarea', placeholder: 'İflas var mı? Sonsuz oynanır mı?' },
        { id: 'sim_depth', label: 'Derinlik vs erişilebilirlik', type: 'textarea', hint: 'Elektrik tablosu mu, tek tuş mu?' }
      ]
    }]
  },

  card: {
    label: 'Kart / Deck Builder', icon: '♠',
    desc: 'Kart havuzu, deste kuralları, sinerji.',
    sections: [{
      id: 'g_card', title: 'Kart Sistemleri',
      questions: [
        { id: 'card_count', label: 'Kart havuzu büyüklüğü', type: 'text', required: true, placeholder: '200 kart' },
        { id: 'deck_rules', label: 'Deste kuralları', type: 'textarea', placeholder: 'Deste boyutu, kopya limiti, başlangıç eli' },
        { id: 'resource_sys', label: 'Kaynak sistemi', type: 'select',
          options: ['Mana (artan)', 'Enerji (sabit)', 'Kart harcama', 'Kaynaksız', 'Karışık'] },
        { id: 'keywords', label: 'Anahtar kelimeler', type: 'table', cols: ['Anahtar kelime', 'Etki', 'Örnek kart'] },
        { id: 'archetypes', label: 'Deste arketipleri', type: 'list', placeholder: 'Aggro, kontrol, kombo...' },
        { id: 'acquisition', label: 'Kart edinme', type: 'select',
          options: ['Run içinde toplama', 'Koleksiyon / paket açma', 'Hepsi açık', 'Draft', 'Zanaat'] },
        { id: 'balance_card', label: 'Denge ve yama planı', type: 'textarea' }
      ]
    }]
  },

  rhythm: {
    label: 'Ritim / Müzik', icon: '♪',
    desc: 'Senkronizasyon, zorluk, şarkı listesi.',
    sections: [{
      id: 'g_rhythm', title: 'Ritim Sistemleri',
      questions: [
        { id: 'input_rhythm', label: 'Giriş yöntemi', type: 'select', required: true,
          options: ['Tuş vuruşu', 'Ritim şeridi (lane)', 'Hareketli nesne', 'Serbest dans', 'Enstrüman kumandası'] },
        { id: 'timing', label: 'Zamanlama pencereleri', type: 'text', placeholder: 'Perfect ±30ms, Good ±80ms' },
        { id: 'tracklist', label: 'Şarkı listesi planı', type: 'textarea', placeholder: 'Orijinal mi lisanslı mı, kaç parça' },
        { id: 'chart', label: 'Nota haritalama (charting)', type: 'textarea', placeholder: 'Elle mi, otomatik mi, zorluk kademeleri' },
        { id: 'latency', label: 'Gecikme kalibrasyonu', type: 'textarea', placeholder: 'Ses/görüntü ofset ayarı' },
        { id: 'scoring', label: 'Puanlama ve kombo', type: 'textarea' }
      ]
    }]
  },

  sandbox: {
    label: 'Sandbox / Yaratıcı', icon: '◫',
    desc: 'Araç setleri, oyuncu ifadesi, paylaşım.',
    sections: [{
      id: 'g_sandbox', title: 'Yaratıcı Araçlar',
      questions: [
        { id: 'tools', label: 'Oyuncuya verilen araçlar', type: 'list', required: true },
        { id: 'constraints', label: 'Sınırlar', type: 'textarea', hint: 'Sınırsız sandbox boş sayfa korkusu yaratır. Kısıt yaz.' },
        { id: 'goals_sb', label: 'Yönlendirme / hedefler', type: 'select',
          options: ['Tamamen serbest', 'İsteğe bağlı görevler', 'Kampanya + serbest mod', 'Meydan okumalar'] },
        { id: 'sharing', label: 'Paylaşım ve topluluk', type: 'multi',
          options: ['Steam Workshop', 'Oyun içi galeri', 'Kod / link paylaşımı', 'Dosya dışa aktarma', 'Paylaşım yok'] },
        { id: 'physics', label: 'Fizik / simülasyon derinliği', type: 'textarea' },
        { id: 'moderation', label: 'İçerik denetimi', type: 'textarea', placeholder: 'Kullanıcı içeriği varsa şart' }
      ]
    }]
  },

  idle: {
    label: 'Idle / Tıklama', icon: '↻',
    desc: 'Üstel büyüme, prestij, bekleme.',
    sections: [{
      id: 'g_idle', title: 'Idle Ekonomisi',
      questions: [
        { id: 'growth', label: 'Büyüme eğrisi', type: 'textarea', required: true, placeholder: 'Maliyet çarpanı, üretim formülü' },
        { id: 'prestige', label: 'Prestij / sıfırlama sistemi', type: 'textarea' },
        { id: 'offline', label: 'Çevrimdışı kazanç', type: 'select', options: ['Tam', 'Azaltılmış', 'Süre sınırlı', 'Yok'] },
        { id: 'layers', label: 'Katman sayısı', type: 'text', placeholder: '3 prestij katmanı' },
        { id: 'wall', label: 'Duvar (wall) noktaları', type: 'textarea', hint: 'Oyuncunun takıldığı yerler kasıtlı mı?' },
        { id: 'active', label: 'Aktif oynanış payı', type: 'textarea', placeholder: 'Sadece bekleme mi, mini oyun var mı?' }
      ]
    }]
  },

  other: {
    label: 'Diğer / Karma', icon: '◇',
    desc: 'Türe özel modül yok, çekirdek bölümlerle devam.',
    sections: [{
      id: 'g_other', title: 'Türe Özel Notlar',
      questions: [
        { id: 'genre_custom', label: 'Türünü kendi kelimelerinle tanımla', type: 'textarea' },
        { id: 'genre_mechanics', label: 'Türe özel mekanikler', type: 'list' },
        { id: 'genre_refs', label: 'Bu türdeki referanslar', type: 'list' }
      ]
    }]
  }
};

/* Çekirdek bölümlerin sırası */
const CORE_ORDER = ['identity', 'vision', 'audience', 'gameplay', 'mechanics', 'narrative', 'art', 'audio', 'tech', 'production', 'marketing'];

/* Tür modülünün ekleneceği yer (bu bölümden SONRA) */
const GENRE_INSERT_AFTER = 'mechanics';

window.SCHEMA = { Q, GENRES, CONDITIONAL, CORE_ORDER, GENRE_INSERT_AFTER };
})();
