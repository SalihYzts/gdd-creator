#!/usr/bin/env python3
"""GDD Creator — konsol hatalarını da toplayan CDP sürücüsü."""
import asyncio, json, sys, urllib.request
import websockets

PORT = 9222
_id = [0]

def page_ws(match="8477"):
    with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json") as r:
        targets = json.load(r)
    for t in targets:
        if t.get("type") == "page" and match in t.get("url", ""):
            return t["webSocketDebuggerUrl"]
    for t in targets:
        if t.get("type") == "page":
            return t["webSocketDebuggerUrl"]
    raise RuntimeError("sayfa yok")

async def _send(ws, method, **params):
    _id[0] += 1
    mid = _id[0]
    await ws.send(json.dumps({"id": mid, "method": method, "params": params}))
    while True:
        msg = json.loads(await ws.recv())
        if msg.get("id") == mid:
            return msg
        _collect(msg)

LOGS = []
def _collect(msg):
    m = msg.get("method")
    if m == "Runtime.consoleAPICalled":
        p = msg["params"]
        if p["type"] in ("error", "warning"):
            txt = " ".join(str(a.get("value", a.get("description", ""))) for a in p.get("args", []))
            LOGS.append(f"[console.{p['type']}] {txt[:300]}")
    elif m == "Runtime.exceptionThrown":
        d = msg["params"]["exceptionDetails"]
        desc = (d.get("exception") or {}).get("description") or d.get("text", "")
        url = (d.get("url") or "").split("/")[-1]
        LOGS.append(f"[exception] {desc[:300]} @{url}:{d.get('lineNumber')}")
    elif m == "Log.entryAdded":
        e = msg["params"]["entry"]
        if e["level"] in ("error", "warning"):
            LOGS.append(f"[log.{e['level']}] {e['text'][:300]} @{(e.get('url') or '').split('/')[-1]}")

async def _drain(ws, secs=0.35):
    end = asyncio.get_event_loop().time() + secs
    while asyncio.get_event_loop().time() < end:
        try:
            msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=0.1))
            _collect(msg)
        except asyncio.TimeoutError:
            pass

async def _run(steps, url=None, match="8477"):
    out = []
    async with websockets.connect(page_ws(match), max_size=60*1024*1024) as ws:
        await _send(ws, "Runtime.enable")
        await _send(ws, "Page.enable")
        await _send(ws, "Log.enable")
        if url:
            await _send(ws, "Page.navigate", url=url)
            await asyncio.sleep(1.5)
            await _drain(ws, 0.4)
        for s in steps:
            if isinstance(s, (int, float)):
                await asyncio.sleep(s); await _drain(ws, 0.1); continue
            r = await _send(ws, "Runtime.evaluate", expression=s,
                            returnByValue=True, awaitPromise=True, userGesture=True)
            res = r.get("result", {})
            ex = res.get("exceptionDetails")
            if ex:
                d = (ex.get("exception") or {}).get("description") or ex.get("text")
                out.append("!! " + str(d)[:400])
            else:
                out.append(res.get("result", {}).get("value"))
            await _drain(ws, 0.12)
        await _drain(ws, 0.3)
    return out

def run(steps, url=None, match="8477"):
    LOGS.clear()
    res = asyncio.run(_run(steps, url, match))
    return res, list(LOGS)

if __name__ == "__main__":
    data = json.load(sys.stdin)
    res, logs = run(data.get("steps", []), data.get("url"), data.get("match", "8477"))
    print(json.dumps({"results": res, "console": logs}, ensure_ascii=False))
