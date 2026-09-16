#!/usr/bin/env python3
"""Chrome'a çoklu indirme izni ver + indirme dizinini ayarla."""
import asyncio, json, urllib.request, sys
import websockets

PORT = 9222

async def main(path):
    with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/version") as r:
        ws_url = json.load(r)["webSocketDebuggerUrl"]
    async with websockets.connect(ws_url, max_size=10*1024*1024) as ws:
        await ws.send(json.dumps({
            "id": 1, "method": "Browser.setDownloadBehavior",
            "params": {"behavior": "allow", "downloadPath": path, "eventsEnabled": True}
        }))
        print(await ws.recv())

asyncio.run(main(sys.argv[1]))
