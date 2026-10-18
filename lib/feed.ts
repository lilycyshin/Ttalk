"use client";
// 서버가 미리 만들어 두는 데이터(/api/today 3시간, /api/trends 1시간)를 앱에서 들고 있는다.
// 앱을 열 때 한 번 미리 받아 두고(prefetch), 탭을 누르면 받아 둔 걸 바로 보여준다.
// 받은 지 STALE_MS가 지났으면 화면은 그대로 두고 뒤에서 새로 받아 바꾼다.
import { useEffect, useState } from "react";

const STALE_MS = 5 * 60_000;
const KEY = (url: string) => `smalltalk.feed.${url}`;

type Entry = { at: number; data: unknown };
const mem = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();
const listeners = new Map<string, Set<(e: Entry) => void>>();

function peek(url: string): Entry | null {
  const hit = mem.get(url);
  if (hit) return hit;
  try {
    const saved: Entry | null = JSON.parse(localStorage.getItem(KEY(url)) ?? "null");
    if (saved) mem.set(url, saved);
    return saved;
  } catch {
    return null;
  }
}

function load(url: string): Promise<unknown> {
  const running = inflight.get(url);
  if (running) return running;
  const p = fetch(url, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((data) => {
      const e = { at: Date.now(), data };
      mem.set(url, e);
      try {
        localStorage.setItem(KEY(url), JSON.stringify(e));
      } catch {}
      listeners.get(url)?.forEach((fn) => fn(e));
      return data;
    })
    .finally(() => inflight.delete(url));
  inflight.set(url, p);
  return p;
}

// 앱을 열 때 부른다. 받아 둔 게 없거나 오래됐으면 미리 받는다.
export function prefetch(...urls: string[]) {
  for (const url of urls) {
    const hit = peek(url);
    if (!hit || Date.now() - hit.at > STALE_MS) load(url).catch(() => {});
  }
}

// 받아 둔 게 있으면 바로 data, 없을 때만 data가 null(로딩). error는 받아 둔 것도 없고 받기도 실패했을 때만.
export function useFeed<T>(url: string) {
  const [entry, setEntry] = useState<Entry | null>(() => (typeof window === "undefined" ? null : peek(url)));
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const fn = (e: Entry) => setEntry(e);
    if (!listeners.has(url)) listeners.set(url, new Set());
    listeners.get(url)!.add(fn);
    const hit = peek(url);
    if (hit) setEntry(hit);
    if (!hit || Date.now() - hit.at > STALE_MS || attempt > 0) {
      setError(false);
      load(url).catch(() => !peek(url) && setError(true));
    }
    return () => void listeners.get(url)?.delete(fn);
  }, [url, attempt]);

  return { data: (entry?.data as T) ?? null, error, retry: () => setAttempt((n) => n + 1) };
}
