# Sınav yazarı brifingi (cp1, cp2, final)

Önce content/AUTHOR_BRIEF.md (öğrenci, kurallar) ve content/SCHEMA.md (Item tipleri: choice/type/order) dosyalarını oku.

Program sınavları ders motorunda soru soru çalışır. Dosya biçimi:

```json
{"id":"cp1","kind":"exam","lang":"it","level":"A1","title":"Checkpoint 1","minutes":20,
 "lead":"1–2 cümle: neyi ölçüyor, kaç soru, geçme eşiği.",
 "scope":["it01","it02","it03","it04","it05","it06","it07","it08"],
 "items":[Item, …], "pass":14}
```

- **cp1**: kapsam it01–it08, 20 soru, pass 14, minutes 20. Başlık "Checkpoint 1 · A1 başlangıç testi".
- **cp2**: kapsam it09–it16, 20 soru, pass 14, minutes 20. Başlık "Checkpoint 2 · A1 ara sınavı". it01–it08 yapıları serbestçe kullanılabilir.
- **final**: kapsam it01–it20, 30 soru, pass 21, minutes 35. Başlık "Final · A1 sınav simülasyonu". Her dersten en az 1 soru olsun. Sorular kolaydan zora sıralansın; son 5 soru kısa çeviri ya da cümle kurma (type) olsun.
- Her Item yokla sorusu gibidir: `ok` ve `hint` yok. **`topic`** (kısa Türkçe konu adı) ve **`from`** (dersin id'si, ör. "it05") zorunlu. choice'ta her yanlış seçenek için `why` yazılır. type'ta doğal varyantlar `a` listesine, aksansız yazım `soft` + `soft_note` olarak eklenir. order'da gerekiyorsa `alt` kullanılır.
- Tip dağılımı yaklaşık %50 choice, %30 type, %20 order.
- Sorular derslerdeki uygula/yokla/pekistir sorularının kopyası olmasın; aynı yapıyı yeni bir cümleyle ölç. Kelimeler derslerde geçmiş olsun.
- Sorular ilgili dersin içeriğiyle birebir tutarlı olmalı. Bunun için önce kapsamdaki content/itNN.json dosyalarını oku.
- Doğrulama: `NODE_PATH=$(npm root -g) node tests/content_check.js cp1 cp2 final`. Engine sınav desteği eklenene kadar bu komut hata verebilir; o durumda en azından JSON'un geçerli olduğunu ve şu kuralları bir Python betiğiyle denetle: choice'ta `a` seçenekler arasında; `why` her yanlış seçenek için var; order'da kelimeler cevapla birebir aynı; soru sayıları ve `pass` doğru.
- Yardımcı betiklerini kendi scratchpad alt klasöründe tut. Sadece content/cp1.json, content/cp2.json ve content/final.json dosyalarını yaz, commit atma.
