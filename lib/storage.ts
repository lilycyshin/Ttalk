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

const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

type Stored = Profile & { savedOn?: string; targetAge?: Profile["targetAges"][number] };

// 내 연령대는 한 번 고르면 고정, 같이 먹는 사람과 관심사는 매일 새로 고른다.
// fresh: 오늘 이미 골랐는지. 아니면 어제 값을 미리 채운 채로 다시 묻는다.
// 예전 프로필은 targetAge 하나만 저장했다. 배열로 바꿔서 읽는다.
export function loadProfile(): { profile: Profile; fresh: boolean } | null {
  const p = read<Stored>(PROFILE_KEY);
  if (!p?.myAge) return null;
  const targetAges = p.targetAges?.length ? p.targetAges : p.targetAge ? [p.targetAge] : [];
  return {
    profile: { myAge: p.myAge, targetAges, interests: p.interests ?? [] },
    fresh: p.savedOn === today() && targetAges.length > 0,
  };
}
export const saveProfile = (p: Profile) => write(PROFILE_KEY, { ...p, savedOn: today() });

