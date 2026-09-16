#!/usr/bin/env python3
"""Zen/Firefox localStorage (data.sqlite) içinden GDD Creator projelerini çıkarır.

Firefox LSNG: `data` tablosu; value snappy ile sıkıştırılmış olabilir
(compression_type: 0=ham, 1=snappy). utf16_length>0 ise metin UTF-16LE'dir.
"""
import sqlite3, sys, json, shutil, os, tempfile

def try_snappy(blob):
    try:
        import snappy
        return snappy.uncompress(blob)
    except Exception:
        pass
    # Saf python snappy ham-blok çözücü (bağımlılık yoksa)
    try:
        return snappy_decompress(blob)
    except Exception:
        return None

def snappy_decompress(data):
    """Snappy ham blok formatı — minimal çözücü."""
    pos = 0
    # preamble: varint uzunluk
    length = 0; shift = 0
    while True:
        b = data[pos]; pos += 1
        length |= (b & 0x7f) << shift
        if not (b & 0x80): break
        shift += 7
    out = bytearray()
    while pos < len(data):
        tag = data[pos]
        t = tag & 0x03
        if t == 0:                       # literal
            n = tag >> 2
            if n < 60:
                pos += 1
            elif n == 60:
                n = data[pos+1]; pos += 2
            elif n == 61:
                n = data[pos+1] | (data[pos+2] << 8); pos += 3
            elif n == 62:
                n = data[pos+1] | (data[pos+2] << 8) | (data[pos+3] << 16); pos += 4
            else:
                n = int.from_bytes(data[pos+1:pos+5], 'little'); pos += 5
            out += data[pos:pos+n+1]; pos += n + 1
        else:
            if t == 1:                   # copy 1-byte offset
                ln = ((tag >> 2) & 0x07) + 4
                off = ((tag >> 5) << 8) | data[pos+1]; pos += 2
            elif t == 2:                 # copy 2-byte offset
                ln = (tag >> 2) + 1
                off = data[pos+1] | (data[pos+2] << 8); pos += 3
            else:                        # copy 4-byte offset
                ln = (tag >> 2) + 1
                off = int.from_bytes(data[pos+1:pos+5], 'little'); pos += 5
            start = len(out) - off
            if start < 0: raise ValueError("geçersiz offset")
            for i in range(ln):
                out.append(out[start + i])
    if len(out) != length:
        raise ValueError(f"uzunluk uyuşmadı: {len(out)} != {length}")
    return bytes(out)

def extract(db_path):
    tmp = tempfile.mktemp(suffix=".sqlite")
    shutil.copy2(db_path, tmp)
    for ext in ("-wal", "-shm"):
        if os.path.exists(db_path + ext):
            shutil.copy2(db_path + ext, tmp + ext)
    con = sqlite3.connect(tmp)
    cur = con.cursor()
    tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'")]
    if "data" not in tables:
        print("data tablosu yok. Tablolar:", tables); return {}
    cols = [d[1] for d in cur.execute("PRAGMA table_info(data)")]
    out = {}
    for row in cur.execute("SELECT * FROM data"):
        rec = dict(zip(cols, row))
        key = rec.get("key")
        val = rec.get("value")
        ctype = rec.get("compression_type", 0)
        u16 = rec.get("utf16_length", 0)
        if isinstance(val, bytes):
            if ctype == 1:
                d = try_snappy(val)
                if d is None:
                    print(f"  ! {key}: snappy çözülemedi ({len(val)} bayt)"); continue
                val = d
            try:
                val = val.decode("utf-16-le") if u16 else val.decode("utf-8")
            except UnicodeDecodeError:
                val = val.decode("utf-8", "replace")
        out[key] = val
    con.close()
    os.remove(tmp)
    for ext in ("-wal", "-shm"):
        if os.path.exists(tmp + ext): os.remove(tmp + ext)
    return out

if __name__ == "__main__":
    data = extract(sys.argv[1])
    print(f"{len(data)} anahtar bulundu:")
    for k, v in data.items():
        print(f"  {k}: {len(str(v))} karakter")
    if len(sys.argv) > 2:
        key = "gddcreator.projects.v1"
        if key in data:
            projects = json.loads(data[key])
            with open(sys.argv[2], "w", encoding="utf-8") as f:
                json.dump(projects, f, ensure_ascii=False, indent=2)
            print(f"\n{len(projects)} proje → {sys.argv[2]}")
            for p in projects:
                print(f"  • {p.get('name')} | {p.get('genre')} | "
                      f"{len(p.get('sections', []))} bölüm | "
                      f"{len(p.get('answers', {}))} cevap | {p.get('updatedAt')}")
        else:
            print(f"\n{key} bulunamadı.")
