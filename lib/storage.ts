import type { Profile } from "./topics";

const PROFILE_KEY = "smalltalk.profile.v1";

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

// 예전 프로필은 targetAge 하나만 저장했다. 배열로 바꿔서 읽는다.
export function loadProfile(): Profile | null {
  const p = read<Profile & { targetAge?: Profile["targetAges"][number] }>(PROFILE_KEY);
  if (!p) return null;
  if (!p.targetAges?.length) {
    if (!p.targetAge) return null;
    p.targetAges = [p.targetAge];
  }
  delete p.targetAge;
  return p;
}
export const saveProfile = (p: Profile) => write(PROFILE_KEY, p);

