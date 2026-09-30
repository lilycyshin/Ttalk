import type { Profile } from "./topics";

const PROFILE_KEY = "smalltalk.profile.v1";
const USED_KEY = "smalltalk.used.v1";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const loadProfile = () => read<Profile>(PROFILE_KEY);
export const saveProfile = (p: Profile) => write(PROFILE_KEY, p);

// 써먹은 멘트 기록: { "2026-09-30": ["헤드라인", ...] }
type Used = Record<string, string[]>;
export const loadUsed = () => read<Used>(USED_KEY) ?? {};
export function toggleUsed(date: string, headline: string): Used {
  const used = loadUsed();
  const day = new Set(used[date] ?? []);
  day.has(headline) ? day.delete(headline) : day.add(headline);
  used[date] = [...day];
  write(USED_KEY, used);
  return used;
}
export const totalUsed = (u: Used) => Object.values(u).reduce((n, d) => n + d.length, 0);
