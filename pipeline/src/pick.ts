// 앱(클라이언트)에서 쓰는 개인화: 하루치 토픽 풀에서 내 관심사·상대 연령대에 맞는 것만 고른다. LLM 호출 없음.
import type { Daily } from "./generate";

export type Profile = { targetAge: "20s" | "30s" | "40s" | "50s_plus"; interests: string[] };

export function pickForUser(daily: Daily, p: Profile, n = 5) {
  const score = (t: Daily["topics"][number]) =>
    t.interests.filter((i) => p.interests.includes(i)).length * 2 + (t.age_fit.includes(p.targetAge) ? 1 : 0);
  return [...daily.topics]
    .sort((a, b) => score(b) - score(a))
    .slice(0, n)
    .map((t) => ({ headline: t.headline, summary: t.summary, ...t.openers[p.targetAge] }));
}
