# TY Dil: ders içerik şeması

Her ders tek bir JSON dosyasıdır: `content/<id>.json` (`it01` … `it06`, `en01` … `en03`).
`content/index.json` dersleri sırasıyla listeler: `[{id, lang, level, title, minutes}]`.

Kullanıcıya görünen bütün metinler Türkçedir; sadece hedef dildeki diziler (`x`, seçenekler, cevaplar) İtalyanca ya da İngilizcedir.
Metin alanlarında tek satır içi biçim **`**kalın**`**'dır. Başka markdown yoktur.

## Üst düzey

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | string | `it05`, `en02` … |
| `lang` | `"it"` \| `"en"` | TTS dili ve koç seçimi için |
| `level` | `"A1"` \| `"B1"` | İngilizce dersler B1+ → B2 hedefli, `"B1"` olarak işaretli |
| `title` | string | Ders başlığı |
| `lead` | string | 1–2 cümle: ders bitince ne yapabileceği |
| `minutes` | number | Tahmini süre |
| `anlat` | Card[] | 2–4 kart, kart başına tek fikir |
| `dinle` | Line[] | 6–10 satır |
| `uygula` | Item[] | 8–12 alıştırma, kolaydan zora |
| `konus` | Konus | Koç (Chiara / Oliver) yönergesi |
| `yokla` | Item[] | Tam 5 soru, her birinde `topic` var |
| `pass` | number | Geçme eşiği (5 üzerinden 4) |
| `pekistir` | `{items: Item[6], konus_prompt: string}` | 2. gün tekrarı: 6 yeni soru + kısa konuşma görevi |

## Card (anlat)

```json
{"title": "...", "blocks": [Block, ...]}
```

Block tipleri:

- `{"type":"p","text":"..."}`: paragraf.
- `{"type":"compare","rows":[{"label":"Türkçe","items":[{"t":"Ben","s":"özne"},{"t":"-yim","s":"olmak (ek)","hl":true}]}, ...]}`: yan yana blok karşılaştırması. `t` = blok metni, `s` = altındaki küçük açıklama, `hl` = vurgulu blok. Satır sayısı 2 ya da 4 olabilir (Türkçe/hedef dil çiftleri).
- `{"type":"table","head":[...],"rows":[[...]],"x":1,"say":[...]}`: tablo.
  - `x` (**opsiyonel**): hedef dil metnini taşıyan sütun indeksi (vurgulanır). Her iki sütunu da hedef dilde olan karşılaştırma tablolarında (en02, en03) `x` yoktur.
  - `say` (opsiyonel): satır `i` için hoparlör düğmesinin okuyacağı metin. Yoksa ve `x` varsa `rows[i][x]` okunabilir.
- `{"type":"note","text":"...","warn":false}`: bilgi kutusu; `warn:true` ise uyarı rengi.
- `{"type":"rules","items":[{"title":"...","text":"...","ex":{"x":"...","tr":"..."}}]}`: numaralı kurallar. `ex` opsiyonel; `ex.x` TTS ile okunabilir.
- `{"type":"examples","items":[{"x":"...","tr":"...","ph":"..."}]}`: örnek cümleler. `ph` opsiyonel (İngilizce derslerde genelde yok).

## Line (dinle)

```json
{"x": "Sono elettricista.", "tr": "Elektrikçiyim.", "ph": "SO-no e-let-tri-ÇİS-ta"}
```

`ph`: Türkçe harflerle okunuş, heceler `-` ile ayrılır, vurgulu hece BÜYÜK harf (büyük i için `İ`). İngilizce derslerde `ph` yoktur.

## Item (uygula / yokla / pekistir)

Ortak alanlar: `t` (tip), `q` (soru metni; `___` boşluk olarak gösterilir), `ok` (doğru cevaptan sonraki kısa pekiştirme; yokla'da yok), `hint` (opsiyonel; prototipte olduğu gibi yokla'da gösterilmemeli).
Yokla'daki her soruda `topic` vardır (kaçırılan konular listesi için).

### choice
```json
{"t":"choice","q":"io ___ Türab.","a":"sono","o":["sono","sei","è"],
 "why":{"sei":"...","è":"..."},"ok":"..."}
```
`a` her zaman `o` içindedir. `why` **her yanlış seçenek için** bir açıklama içerir (anahtarlar seçenek metniyle birebir aynı).

### type
```json
{"t":"type","q":"...","a":["sono elettricista","io sono elettricista"],
 "soft":["il cantiere e grande"],"soft_note":"...","hint":"...","ok":"..."}
```
- `a`: kabul edilen cevaplar. Karşılaştırma, prototipteki `norm()` ile yapılmalı: küçük harf, `. ! ? ¿ , ; : " ' ’` silinir, boşluklar sadeleşir. Bu yüzden kesmeli biçimler (`i've`, `un'amica`) normalize edilince `ive`, `unamica` olur; cevap listeleri buna göre hem kısaltmalı hem açık biçimi içerir.
- `soft` (opsiyonel): “doğru sayılır ama notla” varyantları (çoğunlukla aksansız yazım).
- `soft_note` (opsiyonel, **yeni**): soft eşleşmede gösterilecek not. Prototip bu notu è için sabit yazıyordu; artık her soru kendi notunu taşır. Yoksa varsayılan: “Doğru sayıldı. Doğru yazımı: `a[0]`.”
- `a[0]` her zaman “doğrusu” olarak gösterilecek kanonik cevaptır (küçük harfle yazıldı; gösterirken ilk harf büyütülebilir).

### order
```json
{"t":"order","q":"Sırala: “Şantiye büyük.”","words":["grande","il","è","cantiere"],
 "a":"il cantiere è grande","alt":["..."],"ok":"..."}
```
- `words` karışık sırada verilir; `a` = doğru sıra, kelimeler tek boşlukla.
- `alt` (opsiyonel, **yeni**): aynı kelimelerle kurulan diğer doğru sıralar (ör. yan cümlenin başa ya da sona gelmesi).
- Karşılaştırma `norm()` ile yapılmalı (büyük/küçük harf ve noktalama önemsiz). Özel isimler (`Türab`, `I`) `words` içinde büyük harfle durur.

## Konus

```json
{"coach":"chiara"|"oliver","goal":"...","vocab":["..."],"structures":["..."],
 "opener_hint":"...","level_note":"..."}
```
Koçun sistem yönergesine eklenir. `level_note`, koçun dil düzeyini ve düzeltme biçimini sınırlar (A1: kısa İtalyanca + parantez içinde Türkçe; B1+: doğal İngilizce, toplu düzeltme).

## İlerleme kuralı

İtalyanca derslerde bir yapı öğretilmeden kullanılmaz: it02'de `sono` ve `ho … anni` sadece hazır kalıp; it03'te fiil yok; it04'te sadece `ecco`; essere it05'te, avere it06'da açılır.
