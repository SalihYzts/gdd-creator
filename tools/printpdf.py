#!/usr/bin/env python3
"""Editör ekranını yazdırma CSS'i ile PDF'e basar (Page.printToPDF)."""
import asyncio, base64, json, sys, urllib.request
import websockets

PORT = 9222
_id = [0]

def page_ws(match="8477"):
    with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json") as r:
        for t in json.load(r):
            if t.get("type") == "page" and match in t.get("url", ""):
                return t["webSocketDebuggerUrl"]
    raise RuntimeError("sayfa yok")

async def send(ws, method, **params):
    _id[0] += 1
    mid = _id[0]
    await ws.send(json.dumps({"id": mid, "method": method, "params": params}))
    while True:
        m = json.loads(await ws.recv())
        if m.get("id") == mid:
            return m

async def main(out, match):
    async with websockets.connect(page_ws(match), max_size=80*1024*1024) as ws:
        await send(ws, "Page.enable")
        r = await send(ws, "Page.printToPDF",
                       printBackground=False, preferCSSPageSize=True,
                       paperWidth=8.27, paperHeight=11.69,
                       marginTop=0.7, marginBottom=0.7, marginLeft=0.65, marginRight=0.65)
        data = r["result"]["data"]
        with open(out, "wb") as f:
            f.write(base64.b64decode(data))
        print("PDF yazıldı:", out)

asyncio.run(main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "8477"))
