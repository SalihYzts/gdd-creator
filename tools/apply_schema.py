#!/usr/bin/env python3
"""supabase/schema.sql dosyasını Supabase projesine uygular.

Kullanım:
    SUPABASE_PAT=sbp_... python3 tools/apply_schema.py

Şema idempotenttir — tekrar tekrar çalıştırılabilir.
"""
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request

PAT = os.environ.get("SUPABASE_PAT", "")
REF = os.environ.get("SUPABASE_REF", "eepyucycivgtlpivolvt")


def query(sql):
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{REF}/database/query",
        data=json.dumps({"query": sql}).encode(), method="POST")
    req.add_header("Authorization", "Bearer " + PAT)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            t = r.read().decode()
            return True, (json.loads(t) if t.strip() else [])
    except urllib.error.HTTPError as e:
        return False, e.read().decode()[:600]


def main():
    if not PAT:
        print("SUPABASE_PAT gerekli", file=sys.stderr)
        return 2
    kok = pathlib.Path(__file__).resolve().parent.parent
    sql = (kok / "supabase" / "schema.sql").read_text(encoding="utf-8")
    print(f"{len(sql)} bayt şema → proje {REF}")

    tamam, sonuc = query(sql)
    if not tamam:
        print("HATA:", sonuc, file=sys.stderr)
        return 1
    print("Şema uygulandı.")

    tamam, kontrol = query("""
    select
      (select count(*) from information_schema.tables
        where table_schema='public'
          and table_name in ('profiles','projects','project_members','invites')) as tablo,
      (select count(*) from pg_policies where schemaname='public') as politika,
      (select count(*) from information_schema.routines
        where routine_schema='public'
          and routine_name in ('has_project_access','can_edit_project','is_project_owner',
                               'accept_my_invites','project_members_detail','handle_new_user',
                               'handle_new_project','touch_updated_at')) as fonksiyon,
      (select count(*) from pg_tables where schemaname='public' and rowsecurity) as rls_acik;
    """)
    if tamam:
        k = kontrol[0]
        print(f"  tablo={k['tablo']}/4  politika={k['politika']}  "
              f"fonksiyon={k['fonksiyon']}/8  rls_acik={k['rls_acik']}/4")
        iyi = (k["tablo"] == 4 and k["fonksiyon"] == 8 and k["rls_acik"] == 4
               and k["politika"] >= 15)
        print("  " + ("Kurulum doğrulandı." if iyi else "EKSİK — yukarıdaki sayıları kontrol et."))
        return 0 if iyi else 1
    print("Doğrulama sorgusu başarısız:", kontrol, file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
