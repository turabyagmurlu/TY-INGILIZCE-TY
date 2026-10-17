# İçerik incelemesi: emin olmadığım noktalar

Her dosya şema kurallarına göre otomatik denetlendi: JSON geçerli, sayılar doğru, choice'ta `a` seçenekler arasında, her yanlış seçeneğin `why` açıklaması var, order kelimeleri cevapla birebir aynı, yokla/pekiştir soruları uygula'dakilerin kopyası değil. Aşağıdakiler dil ve tasarım kararları; bir insanın göz atması iyi olur.

## Okunuş (ph) kararları
- **Ünlüler arasındaki s**: standart (Toscana) telaffuza göre ötümsüz yazdım: chiuso `KYU-so`, scivoloso `şi-vo-LO-so`, presa `PRE-sa`, inglese `in-GLE-se`, così `ko-Sİ`. Kuzey İtalya'da (ve bazı TTS seslerinde) bunlar z gibi duyulur (`KYU-zo`, `ko-Zİ`). İstisna olarak **scusi** `SKU-zi` yazdım, çünkü bu kelimede z sesi standart kabul ediliyor. Sesli okuma s ile z arasında gidip gelebilir, iki telaffuz da doğru.
- **gn, gli, sc ünlüler arasında aslında uzun okunur** ([ˈbaɲɲo], [faˈmiʎʎa], [uʃˈʃita]). Türkçe harflerle sade kalsın diye `BA-nyo`, `fa-Mİ-lya`, `u-Şİ-ta` yazdım ve uzunluğu göstermedim.
- **e/o açık–kapalı farkı** (bène / pésca gibi) gösterilmedi; A1 için gereksiz yük.
- **z**: zio/zona/zero/zaino için standart sözlük biçimini kullandım (zona, zero, zaino = dz; attenzione, sicurezza, pizza = ts). Bölgesel farklar var; derste “emin değilsen ts de” notu duruyor.
- **cc + i/e ve gg + i/e** çift olarak yazıldı: ghiaccio `GYAT-ço`, cacciavite `kat-ça-Vİ-te`, oggi `OD-ci`. Daha yaygın gösterim `GYAÇ-ço` biçimidir; bu tercih tutarlılık için yapıldı.

## Dilbilgisi ve tasarım kararları
- **it02 selam saatleri**: “buongiorno öğleden sonraya kadar, buonasera öğleden sonra ve akşam” dedim. Geçiş saati bölgeye göre değişir (bazı yerlerde 13:00'te başlar). Bu yüzden sınırda kalan saatler soru olarak sorulmadı (9:00, 11:30, 19:00, 23:00 kullanıldı).
- **it02'de “Mi chiamo”, “Come stai/sta”, “Non c'è male”** fiil yapıları anlatılmadan hazır kalıp olarak veriliyor; bu kasıtlı. “Sono turco / Sono di Kırıkkale / Ho 24 anni” de kalıp olarak işaretli.
- **it03 -co çoğulu**: kural `-co → -chi` olarak verildi, amico → amici ve elettrico → elettrici istisna diye anıldı. Gerçek kural vurgunun yerine bağlı (sondan üçüncü hecede vurgu varsa genelde -ci). A1'de bu ayrıntı verilmedi.
- **it04 “una amica”** yazımı type sorusunda soft kabul ediliyor (doğrusu un'amica). Bu bilerek esnek bırakıldı.
- **it05'te “a Kırıkkale”, “in cantiere”, “di Milano”** edatlar öğretilmeden kalıp olarak kullanıldı (prototipte de “Sono di Kırıkkale” vardı). Ayrıca “Ragazzi” kelimesi soruların içinde açıklanıyor.
- **it06 “Ho caldo” = Sıcakladım / Sıcaktan bunaldım.** “Ho freddo / Sono freddo” farkı esprili bir notla verildi. Sono freddo'nun “soğuk biriyim / dokununca soğuğum” anlamı doğru, sadece mizahi tonu kontrol edilsin.
- **en01 “I used to work night shifts”** çevirisinde birkaç doğal varyant kabul ediliyor. Kullanıcı başka doğal bir biçim yazarsa (ör. “I used to do night shifts”) reddedilir. Gerekirse liste genişletilebilir ya da koça yönlendirilebilir.
- **en02 “The engineer just called”** (Amerikan İngilizcesi) soft kabul ediliyor ve notla düzeltiliyor.
- **en03 “She has been living in Bodrum since 2025”** sorusunda “has lived” de doğru olurdu. Seçeneklerde yok, `ok` metninde de belirtiliyor.

## Şemaya eklenen alanlar (entegrasyon için)
- `soft_note` (type): soft eşleşmede gösterilecek, soruya özel not. Prototipteki sabit “è aksanlı” mesajının yerine geçer.
- `alt` (order): kabul edilen diğer kelime sıraları (en01'de 2 soruda var).
- `x` (table) artık opsiyonel: en02 ve en03'teki iki sütunlu karşılaştırma tablolarında yok.
- Ayrıntılar `SCHEMA.md` dosyasında.

## it07–it20 / en04–en12 turu (Ekim 2026)
- **fase** `FA-ze`: sözlükteki standart z sesi; ünlüler arası s kuralının bilinçli istisnası (scusi gibi).
- **a lavoro / al lavoro**: it11 konuşma dilindeki "a lavoro"yu öğretir, "al lavoro" da kabul edilir (birleşik edat it14'te).
- **restare / rimanere**: it20 restare öğretir; rimasto'nun daha sık olduğu notta anılır.
- **Seviye**: it19–it20 "A2", en11–en12 "B2" (müfredat SYL ile aynı).
- Denetim puanları (düzeltmeden sonra): it07–it20 90–95, en04–en12 92–94.

## it21–it34 + sınavlar turu (Ekim 2026)
- Denetim puanları: it21–it34 92–95; cp1 93, cp2 94, final 93.
- Bilinçli sadeleştirmeler: it27 ne + ortaç uyumu zorunlu öğretilir (konuşmada uyumsuz da duyulur); it31 glielo "onlara" da (gündelik dil); it32 deva sadece notta; it28 "biglietto solo andata" konuşma biçimi.
