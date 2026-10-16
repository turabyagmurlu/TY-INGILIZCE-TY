#!/usr/bin/env python3
"""TY Dil derleyici: src/ parçalarını tek index.html'e birleştirir (GitHub Pages girişi).
Kullanım: python3 build.py            → index.html
Çıktı deterministiktir (zaman damgası yok). Bağımlılık yok (yalnızca Python 3 standart kitaplığı).

Sıra (artifact build.py ile aynı, önüne rt.js eklendi):
  CSS : dd_head.html <style> + dd_chat.css + prog_style.css + focus_style.css + settings.css + voice.css + units.css
  Gövde: dd_head.html'in <style> dışındaki kısmı (<title> atılır; head'e taşınır)
  JS  : rt.js (window.claude shim, önce) · (function(){ dd_data, dd_art, dd_logic, prog_logic, dd_chat, focus_logic, dd_parse, dd_instr, settings, voice, dd_events, units_data, units, install, pen, qr_vendor, keyxfer, sync })();  — units_* Dersler sekmesi (TYDIL.registerUnits ile bağlanır) · install: Telefona kur (PWA) · pen: vurgu kalemi · keyxfer: QR aktarım · sync: cihazlar arası senkron (GitHub Gist)
  Son : service worker kaydı
"""
import os, re, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
CSS_PARTS = [("dd_chat.css", "SOHBET"), ("prog_style.css", "PROGRAM"), ("focus_style.css", "DERS MODU"), ("settings.css", "AYARLAR"), ("voice.css", "SES"), ("units.css", "DERSLER"), ("install.css", "TELEFONA KUR"), ("pen.css", "VURGU KALEMİ"), ("keyxfer.css", "ANAHTAR AKTARIMI"), ("sync.css", "SENKRON")]
JS_PARTS = ["dd_data.js", "dd_art.js", "dd_logic.js", "prog_logic.js", "dd_chat.js", "focus_logic.js", "dd_parse.js", "dd_instr.js", "settings.js", "voice.js", "dd_events.js", "units_data.js", "units.js", "install.js", "pen.js", "qr_vendor.js", "keyxfer.js", "sync.js"]
THEME_LIGHT, THEME_DARK = "#F7F4EF", "#0F1722"

# Satır başındaki /* … */ açıklama blokları çıktıdan atılır (kaynakta kalır; gzip boyutu GitHub Pages bütçesinin altında kalsın).
# Lisans/telif içerenler korunur. Satır içi açıklamalara ve HTML gövdesine dokunulmaz.
_CMT = re.compile(r"(?m)^[ \t]*/\*[\s\S]*?\*/[ \t]*\n")
def strip_comments(src):
    return _CMT.sub(lambda m: m.group(0) if re.search(r"Copyright|MIT|lisans", m.group(0)) else "", src)

def read(name):
    with open(os.path.join(SRC, name), encoding="utf-8") as f:
        return f.read()

def build():
    head = read("dd_head.html")
    m = re.search(r"<title>(.*?)</title>\s*", head, re.S)
    title = m.group(1).strip() if m else "TY Dil"
    head = head.replace(m.group(0), "", 1) if m else head
    a, b = head.index("<style>"), head.index("</style>")
    css = head[a + len("<style>"):b]
    body = head[b + len("</style>"):].strip("\n")
    for name, lbl in CSS_PARTS:
        css += "\n/* ---- " + lbl + " ---- */\n" + read(name) + "\n"
    css = strip_comments(css)
    rt = strip_comments(read("rt.js"))
    app = strip_comments("".join(read(p) + "\n" for p in JS_PARTS))
    js = "(function(){\n\"use strict\";\n" + app + "})();"
    sw = ('if("serviceWorker" in navigator&&/^https?:$/.test(location.protocol)){addEventListener("load",()=>{navigator.serviceWorker.register("./sw.js").catch(()=>{});});}')
    out = ("<!doctype html>\n<html lang=\"tr\">\n<head>\n"
           "<meta charset=\"utf-8\">\n"
           "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n"
           f"<meta name=\"theme-color\" media=\"(prefers-color-scheme: light)\" content=\"{THEME_LIGHT}\">\n"
           f"<meta name=\"theme-color\" media=\"(prefers-color-scheme: dark)\" content=\"{THEME_DARK}\">\n"
           "<meta name=\"color-scheme\" content=\"light dark\">\n"
           "<meta name=\"description\" content=\"TY Dil — İtalyanca A1 ve İngilizce B2 için günlük ders, koçlar, kelime kartları ve ilerleme. Kayıtlar cihazda.\">\n"
           "<link rel=\"manifest\" href=\"manifest.webmanifest\">\n"
           "<link rel=\"icon\" type=\"image/png\" sizes=\"192x192\" href=\"icon-192.png\">\n"
           "<link rel=\"apple-touch-icon\" href=\"apple-touch-icon.png\">\n"
           "<meta name=\"apple-mobile-web-app-capable\" content=\"yes\">\n"
           "<meta name=\"mobile-web-app-capable\" content=\"yes\">\n"
           f"<meta name=\"apple-mobile-web-app-title\" content=\"{title}\">\n"
           "<meta name=\"apple-mobile-web-app-status-bar-style\" content=\"default\">\n"
           f"<title>{title}</title>\n"
           "<style>" + css + "</style>\n"
           "</head>\n<body>\n" + body + "\n"
           "<script>\n" + rt + "\n</script>\n"
           "<script>\n" + js + "\n</script>\n"
           "<script>" + sw + "</script>\n"
           "</body>\n</html>\n")
    path = os.path.join(ROOT, "index.html")
    with open(path, "w", encoding="utf-8") as f:
        f.write(out)
    return path, len(out.encode("utf-8"))

if __name__ == "__main__":
    p, n = build()
    print("built", os.path.relpath(p, ROOT), n, "bytes")
