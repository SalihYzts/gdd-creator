#!/usr/bin/env python3
"""GDD Creator — GERÇEK Supabase'e karşı RLS testi.

Sahte sunucu testleri (tests/cloud-test.html) istemci mantığını doğrular;
bu dosya asıl güvenlik sınırını — Postgres RLS'i — gerçek sunucuda sınar.

Kullanım:
    SUPABASE_PAT=sbp_... python3 tools/rls_test.py

PAT'i koda gömme. https://supabase.com/dashboard/account/tokens
"""
import json as J
import os
import sys
import urllib.error
import urllib.request

PAT = os.environ.get("SUPABASE_PAT", "")
REF = os.environ.get("SUPABASE_REF", "eepyucycivgtlpivolvt")
BASE = f"https://{REF}.supabase.co"
SIFRE = "TestGdd!2026x"
KULLANICILAR = [
    "gddtest-sahip@ornek-test.com",
    "gddtest-editor@ornek-test.com",
    "gddtest-izleyen@ornek-test.com",
]

gecti = basarisiz = 0
hatalar = []


def ok(ad, kosul, detay=""):
    global gecti, basarisiz
    if kosul:
        gecti += 1
        print(f"  \033[32m✓\033[0m {ad}")
    else:
        basarisiz += 1
        hatalar.append(ad)
        print(f"  \033[31m✗\033[0m {ad}  → {str(detay)[:200]}")


def mgmt(path, method="GET", body=None):
    url = "https://api.supabase.com/v1" + path
    data = J.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", "Bearer " + PAT)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            t = r.read().decode()
            return J.loads(t) if t.strip() else {}
    except urllib.error.HTTPError as e:
        return {"_hata": e.code, "_mesaj": e.read().decode()[:300]}


def rest(path, method="GET", body=None, jwt=None, apikey=None, prefer=None, anon=None):
    url = BASE + path
    data = J.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("apikey", apikey or anon)
    req.add_header("Authorization", "Bearer " + (jwt or apikey or anon))
    req.add_header("Content-Type", "application/json")
    if prefer:
        req.add_header("Prefer", prefer)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            t = r.read().decode()
            return {"ok": True, "kod": r.status, "veri": J.loads(t) if t.strip() else None}
    except urllib.error.HTTPError as e:
        g = e.read().decode()
        try:
            g = J.loads(g)
        except Exception:
            pass
        return {"ok": False, "kod": e.code, "hata": g}


def main():
    if not PAT:
        print("SUPABASE_PAT ortam değişkeni gerekli.", file=sys.stderr)
        return 2

    keys = mgmt(f"/projects/{REF}/api-keys")
    if isinstance(keys, dict) and "_hata" in keys:
        print("Anahtarlar alınamadı:", keys, file=sys.stderr)
        return 2
    ANON = next(k["api_key"] for k in keys if k["name"] == "anon")
    SERVICE = next(k["api_key"] for k in keys if k["name"] == "service_role")

    R = lambda *a, **kw: rest(*a, anon=ANON, **kw)

    # --- temizlik: önceki testten kalanlar ---
    mgmt(f"/projects/{REF}/database/query", "POST", {"query":
        "delete from public.projects where name like 'RLS Testi%' or name in ('Sahte','Min Test');"})

    # --- test kullanıcıları ---
    for m in KULLANICILAR:
        R("/auth/v1/admin/users", "POST",
          {"email": m, "password": SIFRE, "email_confirm": True,
           "user_metadata": {"full_name": m.split("@")[0]}}, apikey=SERVICE)

    def giris(mail):
        r = R("/auth/v1/token?grant_type=password", "POST", {"email": mail, "password": SIFRE})
        if not r["ok"]:
            raise SystemExit(f"Giriş başarısız {mail}: {r}")
        return r["veri"]["access_token"]

    J_SAHIP, J_EDITOR, J_IZLEYEN = [giris(m) for m in KULLANICILAR]

    def kid(mail):
        r = R(f"/rest/v1/profiles?select=id&email=eq.{mail}", jwt=J_SAHIP)
        return r["veri"][0]["id"] if r["ok"] and r["veri"] else None

    ID_SAHIP, ID_EDITOR, ID_IZLEYEN = [kid(m) for m in KULLANICILAR]

    print("\n\033[90mPROFİL TETİKLEYİCİSİ\033[0m")
    pr = R("/rest/v1/profiles?select=id,email&email=like.gddtest-*", jwt=J_SAHIP)
    ok("Kayıt olunca profil satırı açılıyor", pr["ok"] and len(pr["veri"]) >= 3, pr)
    ok("Profil id'leri çözüldü", all([ID_SAHIP, ID_EDITOR, ID_IZLEYEN]))

    print("\n\033[90mPROJE OLUŞTURMA\033[0m")
    p = R("/rest/v1/projects", "POST", {
        "owner_id": ID_SAHIP, "name": "RLS Testi", "genre": "roguelike",
        "data": {"schemaVersion": 1, "extras": [], "sections": [],
                 "answers": {"identity.title": "RLS Testi"}}},
        jwt=J_SAHIP, prefer="return=representation")
    ok("Sahip proje oluşturdu (INSERT+RETURNING)", p["ok"], p.get("hata"))
    if not p["ok"]:
        return 1
    PID = p["veri"][0]["id"]

    m = R(f"/rest/v1/project_members?select=user_id,role&project_id=eq.{PID}", jwt=J_SAHIP)
    ok("Tetikleyici sahibi 'owner' üye yaptı",
       m["ok"] and any(x["role"] == "owner" for x in m["veri"]), m)

    sahte = R("/rest/v1/projects", "POST",
              {"owner_id": ID_EDITOR, "name": "Sahte", "genre": "x", "data": {}},
              jwt=J_SAHIP, prefer="return=minimal")
    ok("Başkası adına proje REDDEDİLDİ", not sahte["ok"], f"kod={sahte.get('kod')}")

    print("\n\033[90mYABANCI ERİŞİMİ\033[0m")
    g = R(f"/rest/v1/projects?select=id&id=eq.{PID}", jwt=J_EDITOR)
    ok("Yabancı projeyi GÖREMİYOR", g["ok"] and len(g["veri"]) == 0, g)

    R(f"/rest/v1/projects?id=eq.{PID}", "PATCH", {"name": "Ele geçirildi"},
      jwt=J_EDITOR, prefer="return=minimal")
    chk = R(f"/rest/v1/projects?select=name&id=eq.{PID}", jwt=J_SAHIP)
    ok("Yabancı DÜZENLEYEMİYOR", chk["veri"][0]["name"] == "RLS Testi", chk)

    print("\n\033[90mDAVET\033[0m")
    inv = R("/rest/v1/invites", "POST",
            {"project_id": PID, "email": KULLANICILAR[1], "role": "editor", "invited_by": ID_SAHIP},
            jwt=J_SAHIP, prefer="return=representation")
    ok("Sahip davet etti", inv["ok"], inv.get("hata"))

    kotu = R("/rest/v1/invites", "POST",
             {"project_id": PID, "email": "x@y.com", "role": "editor", "invited_by": ID_IZLEYEN},
             jwt=J_IZLEYEN, prefer="return=minimal")
    ok("Yabancı DAVET EDEMİYOR", not kotu["ok"], f"kod={kotu.get('kod')}")

    print("\n\033[90mDAVET KABULÜ\033[0m")
    acc = R("/rest/v1/rpc/accept_my_invites", "POST", {}, jwt=J_EDITOR)
    ok("accept_my_invites çalıştı", acc["ok"], acc.get("hata"))
    ok("Üyelik oluştu",
       acc["ok"] and any(x["out_project_id"] == PID and x["out_role"] == "editor"
                         for x in (acc["veri"] or [])), acc.get("veri"))

    lst = R("/rest/v1/projects?select=id,name", jwt=J_EDITOR)
    ok("Editör projeyi artık görüyor",
       lst["ok"] and any(x["id"] == PID for x in lst["veri"]), lst)

    print("\n\033[90mEDİTÖR YETKİLERİ\033[0m")
    up = R(f"/rest/v1/projects?id=eq.{PID}", "PATCH",
           {"data": {"schemaVersion": 1, "extras": [], "sections": [],
                     "answers": {"vision.hook": "editörden"}}},
           jwt=J_EDITOR, prefer="return=representation")
    ok("Editör YAZABİLİYOR",
       up["ok"] and up["veri"][0]["data"]["answers"]["vision.hook"] == "editörden", up.get("hata"))

    R(f"/rest/v1/projects?id=eq.{PID}", "DELETE", jwt=J_EDITOR, prefer="return=minimal")
    kalan = R(f"/rest/v1/projects?select=id&id=eq.{PID}", jwt=J_SAHIP)
    ok("Editör SİLEMİYOR", len(kalan["veri"]) == 1, "proje silindi!")

    print("\n\033[90mİZLEYEN YETKİLERİ\033[0m")
    inv2 = R("/rest/v1/invites", "POST",
             {"project_id": PID, "email": KULLANICILAR[2], "role": "viewer", "invited_by": ID_SAHIP},
             jwt=J_SAHIP, prefer="return=minimal")
    ok("İzleyen davet edildi", inv2["ok"], inv2.get("hata"))

    acc2 = R("/rest/v1/rpc/accept_my_invites", "POST", {}, jwt=J_IZLEYEN)
    ok("İzleyen daveti kabul etti", acc2["ok"] and acc2["veri"], acc2)

    gor = R(f"/rest/v1/projects?select=id,data&id=eq.{PID}", jwt=J_IZLEYEN)
    ok("İzleyen OKUYABİLİYOR", gor["ok"] and len(gor["veri"]) == 1, gor)

    R(f"/rest/v1/projects?id=eq.{PID}", "PATCH",
      {"data": {"answers": {"vision.hook": "İZLEYEN YAZDI"}}},
      jwt=J_IZLEYEN, prefer="return=minimal")
    son = R(f"/rest/v1/projects?select=data&id=eq.{PID}", jwt=J_SAHIP)
    ok("İzleyen YAZAMIYOR",
       son["veri"][0]["data"]["answers"].get("vision.hook") == "editörden",
       son["veri"][0]["data"]["answers"])

    print("\n\033[90mROL YÖNETİMİ\033[0m")
    rl = R(f"/rest/v1/project_members?project_id=eq.{PID}&user_id=eq.{ID_EDITOR}", "PATCH",
           {"role": "viewer"}, jwt=J_SAHIP, prefer="return=minimal")
    ok("Sahip rol değiştirdi", rl["ok"], rl.get("hata"))

    R(f"/rest/v1/project_members?project_id=eq.{PID}&user_id=eq.{ID_EDITOR}", "PATCH",
      {"role": "owner"}, jwt=J_IZLEYEN, prefer="return=minimal")
    k2 = R(f"/rest/v1/project_members?select=role&project_id=eq.{PID}&user_id=eq.{ID_EDITOR}",
           jwt=J_SAHIP)
    ok("İzleyen rol DEĞİŞTİREMİYOR", k2["veri"][0]["role"] == "viewer", k2)

    print("\n\033[90mÜYE LİSTESİ\033[0m")
    det = R("/rest/v1/rpc/project_members_detail", "POST", {"p_project": PID}, jwt=J_SAHIP)
    ok("project_members_detail çalıştı", det["ok"], det.get("hata"))
    ok("Üç üye listelendi", det["ok"] and len(det["veri"]) == 3, det.get("veri"))
    if det["ok"]:
        for u in det["veri"]:
            print(f"       {u['email']:<34} {u['role']:<8} "
                  f"{'bekliyor' if u['pending'] else 'üye'}")

    print("\n\033[90mSAHİP SİLEBİLİR\033[0m")
    R(f"/rest/v1/projects?id=eq.{PID}", "DELETE", jwt=J_SAHIP, prefer="return=minimal")
    bitti = R(f"/rest/v1/projects?select=id&id=eq.{PID}", jwt=J_SAHIP)
    ok("Sahip projeyi sildi", len(bitti["veri"]) == 0, bitti)

    uye = R(f"/rest/v1/project_members?select=project_id&project_id=eq.{PID}", jwt=J_SAHIP)
    ok("Üyelikler de silindi (cascade)", len(uye["veri"]) == 0, uye)

    print()
    if basarisiz == 0:
        print(f"\033[32mTÜMÜ GEÇTİ — {gecti} test\033[0m")
    else:
        print(f"\033[31m{basarisiz} BAŞARISIZ / {gecti + basarisiz} test\033[0m")
        for h in hatalar:
            print("   -", h)
    return 0 if basarisiz == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
