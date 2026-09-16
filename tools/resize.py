#!/usr/bin/env python3
"""Tarayıcı penceresini yeniden boyutlandırır (gerçek media query tetiklenir)."""
import asyncio, json, sys, urllib.request
import websockets

PORT = 9222

def page_target(match="8477"):
    with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json") as r:
        for t in json.load(r):
            if t.get("type") == "page" and match in t.get("url", ""):
                return t
    raise SystemExit("sayfa yok")

async def main(w, h):
    t = page_target()
    with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/version") as r:
        browser_ws = json.load(r)["webSocketDebuggerUrl"]
    async with websockets.connect(browser_ws, max_size=10*1024*1024) as ws:
        await ws.send(json.dumps({"id": 1, "method": "Browser.getWindowForTarget",
                                  "params": {"targetId": t["id"]}}))
        while True:
            m = json.loads(await ws.recv())
            if m.get("id") == 1:
                wid = m["result"]["windowId"]; break
        await ws.send(json.dumps({"id": 2, "method": "Browser.setWindowBounds",
            "params": {"windowId": wid, "bounds": {"windowState": "normal", "width": w, "height": h}}}))
        while True:
            m = json.loads(await ws.recv())
            if m.get("id") == 2:
                print(f"pencere → {w}x{h}"); return

asyncio.run(main(int(sys.argv[1]), int(sys.argv[2])))
