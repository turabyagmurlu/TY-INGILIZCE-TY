# Ders yazarı brifingi (it07–it20, en04–en12)

Repo: /home/claude/TY-INGILIZCE-TY. Uygulama: TY Dil, Türab'ın kendi dil uygulaması.

## Öğrenci
- Türab Yağmurlu, 24 yaşında, Kırıkkale'den. Elektrik taşeronu ustabaşı (MDF Elektrik); şantiye, pano, kablo, ekip yönetimi. Sosyoloji mezunu.
- İtalyanca: sıfırdan, 12 haftada A1. İngilizce: B1+ → B2.
- Ne istiyor: teori ağırlıklı, "anlat + görselle göster", hızlandırılmış kurs gibi özü veren, doğru bilgi. Çocukça oyun ya da süs istemiyor. Kısa, tek fikirli kartlar istiyor (uzun ansiklopedik metin işe yaramadı). Örnekler sahadan ve gerçek hayatından olsun: şantiye, pano, kablo, ekip, kafe, Kırıkkale, Bodrum. Dersin sonunda kendini yoklama var.
- Önceki ders (it05/it06) için puanı düşüktü, çünkü "yeterince öğretici değil" dedi. Bu yüzden anlat kartları gerçekten öğretmeli: kural, neden öyle, Türkçeyle karşılaştırma, tipik Türk hatası.

## Okunacaklar (önce bunlar)
1. `content/SCHEMA.md`: şema. Kesin kurallar burada.
2. `content/REVIEW_NOTES.md`: okunuş (ph) gösterim kararları ve tutarlılık kuralları.
3. Örnek dosyalar: İtalyanca için `content/it05.json` ve `content/it06.json`; İngilizce için `content/en02.json` ve `content/en03.json`. Kalite, uzunluk ve ton bunlarla aynı olmalı. Dosyalar 13–21 KB arası.
4. `src/dd_data.js` içindeki SYL listesi (satır 3–50): her dersin kapsamı.

## Kurallar
- Bütün kullanıcı metni Türkçe (Türkçe karakterlerle). Sadece hedef dil dizileri İtalyanca/İngilizce.
- Kartlar: 3–4 anlat kartı, kart başına tek fikir. Her kartta en az bir görsel blok olsun (compare, table, rules ya da examples). Telefonda okunacağı için bir karttaki toplam metin ~150 kelimeyi geçmesin.
- dinle 6–10 satır. uygula 8–12 alıştırma, kolaydan zora; choice/type/order karışık. yokla tam 5 soru, `topic` alanlı, uygula'nın kopyası değil. pass 4. pekistir 6 yeni soru + konus_prompt.
- choice: `why` her yanlış seçenek için (anahtar seçenek metniyle birebir). type: `a` listesi normalize edilmiş biçimlerin hepsini içersin (kesmeli biçimler, eşanlamlı doğal cevaplar). Aksansız yazım için `soft` + `soft_note`.
- **İtalyanca ilerleme kuralı:** bir yapı, SYL sırasında öğretilmeden önce kullanılmaz. Önceki derslerin yapıları serbest. Daha sonra öğretilecek bir yapı zorunluysa "hazır kalıp" diye açıkça işaretle (it02'deki gibi). Yeni kelimeler serbest ama açıklanmalı. İtalyanca derslerde `ph` (Türkçe harflerle okunuş, vurgulu hece BÜYÜK) dinle satırlarında ve örneklerde zorunlu; REVIEW_NOTES'taki gösterim kararlarına uy.
- İtalyanca konus: coach "chiara", A1 level_note (kısa İtalyanca + parantez içinde Türkçe). İngilizce konus: coach "oliver"; `goal`, o haftanın konuşma temasını kullansın (src/dd_data.js'deki SPEAK_EN listesi, enN = N. eleman).
- Dilbilgisi %100 doğru olmalı. Emin olmadığın bir noktayı soru yapma.
- Dinle satırlarının ve konus.vocab'ın kelimeleri derse göre kartlara eklenir. Dinle'yi işe yarar, yeniden kullanılabilir cümlelerle doldur.

## Doğrulama (zorunlu)
Her dosyayı yazınca şunu çalıştır:
`cd /home/claude/TY-INGILIZCE-TY && NODE_PATH=$(npm root -g) node tests/content_check.js <id> [<id>…]`
Çıktı ALL PASS olmalı. Bu test şemayı denetler, bütün adımları çizer ve doğru cevapların kabul edildiğini doğrular.

## Yapma
- `content/index.json`, src/, tests/ ve başka derslerin dosyalarına dokunma. Sadece sana verilen `content/<id>.json` dosyalarını yaz.
- git commit atma.

## Teslim
En fazla 15 satırlık rapor: yazdığın dosyalar, content_check sonucu, emin olmadığın dil kararları (madde madde).
