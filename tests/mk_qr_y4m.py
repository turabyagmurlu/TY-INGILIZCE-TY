"""Test yardımcısı: verilen metni QR olarak içeren sahte kamera videosu (.y4m) üretir. Kullanım: python3 mk_qr_y4m.py "<metin>" çıktı.y4m"""
import sys, cv2, numpy as np
text, out = sys.argv[1], sys.argv[2]
q = cv2.QRCodeEncoder.create().encode(text)          # 1 px/modül, sessiz bölgeli
side = 400; q = cv2.resize(q, (side, side), interpolation=cv2.INTER_NEAREST)
W, H = 640, 480; frame = np.full((H, W), 235, np.uint8)
y0, x0 = (H - side) // 2, (W - side) // 2; frame[y0:y0+side, x0:x0+side] = q
uv = np.full((H // 2, W // 2), 128, np.uint8)
with open(out, "wb") as f:
    f.write(f"YUV4MPEG2 W{W} H{H} F15:1 Ip A1:1 C420jpeg\n".encode())
    for _ in range(30): f.write(b"FRAME\n"); f.write(frame.tobytes()); f.write(uv.tobytes()); f.write(uv.tobytes())
print("ok", out)
