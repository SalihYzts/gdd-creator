#!/usr/bin/env python3
"""Test artıklarını Supabase'den temizler.

Siler: debug fonksiyonları, gddtest-* kullanıcıları ve onların projeleri.
Gerçek kullanıcı verisine DOKUNMAZ.

Kullanım:
    SUPABASE_PAT=sbp_... python3 tools/temizle.py
"""
import json
import os
import sys
import urllib.error
import urllib.request

PAT = os.environ.get("SUPABASE_PAT", "")
REF = os.environ.get("SUPABASE_REF", "eepyucycivgtlpivolvt")


def mgmt(path, method="GET", body=None):
    req = urllib.request.Request("https://api.supabase.com/v1" + path,
                                 data=json.dumps(body).encode() if body else None,
                                 method=method)
    req.add_header("Authorization", "Bearer " + PAT)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            t = r.read().decode()
            return True, (json.loads(t) if t.strip() else [])
    except urllib.error.HTTPError as e:
        return False, e.read().decode()[:400]


def main():
    if not PAT:
        print("SUPABASE_PAT gerekli", file=sys.stderr)
        return 2

    print("Önce:")
    ok, once = mgmt(f"/projects/{REF}/database/query", "POST", {"query": """
      select (select count(*) from public.projects) as proje,
             (select count(*) from auth.users where email like 'gddtest-%' or email like 'gddui%') as test_kullanici,
             (select count(*) from information_schema.routines
                where routine_schema='public' and routine_name like 'debug_%') as debug_fn;
    """})
    print(" ", once)

    ok, r = mgmt(f"/projects/{REF}/database/query", "POST", {"query": """
      drop function if exists public.debug_whoami();
      -- test kullanıcıları silinince projeleri cascade ile gider
      delete from auth.users where email like 'gddtest-%' or email like 'gddui%';
      delete from public.projects where name in ('RLS Testi','Sahte','Min Test','Paylaşım Denemesi','İzole Test');
      delete from public.invites where email like '%@ornek-test.com';
    """})
    if not ok:
        print("HATA:", r, file=sys.stderr)
        return 1

    ok, sonra = mgmt(f"/projects/{REF}/database/query", "POST", {"query": """
      select (select count(*) from public.projects) as proje,
             (select count(*) from auth.users) as kullanici,
             (select count(*) from public.invites) as davet,
             (select count(*) from information_schema.routines
                where routine_schema='public' and routine_name like 'debug_%') as debug_fn;
    """})
    print("Sonra:")
    print(" ", sonra)
    print("Temizlendi.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
