// 오늘의 토픽 풀을 실시간으로 만든다: 관심사별 뉴스 수집 → (키 있으면) Gemini로 멘트 생성, 없으면 틀 멘트.
import { GoogleGenAI } from "@google/genai";
import { INTERESTS, type Daily, type Topic } from "@/lib/topics";
import { collect, type InterestId } from "./sources";
import { generateForInterest } from "./generate";
import { fallbackTopics, isSmallTalkSafe } from "./fallback";

export type LiveDaily = Daily & { generatedAt: string; mode: "gemini" | "template" };

// interests: 수집할 관심사. 앱은 사용자가 고른 것만 넘겨서 수집·생성 비용을 줄인다.
export async function buildToday(interests: InterestId[] = INTERESTS.map((i) => i.id)): Promise<LiveDaily> {
  const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const cands = await collect(interests);
  if (cands.length === 0) throw new Error("no news collected");

  const client = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
  const perInterest = await Promise.all(
    interests.map(async (id) => {
      const mine = cands.filter((c) => c.interest === id);
      if (mine.length === 0) return [];
      if (!client) return fallbackTopics(mine);
      try {
        return await generateForInterest(client, id, mine, date);
      } catch (e) {
        // 한 관심사가 실패해도 나머지는 살린다. 이 관심사만 틀 멘트로.
        console.warn("generate failed:", id, e);
        return fallbackTopics(mine.filter(isSmallTalkSafe));
      }
    }),
  );

  // 같은 기사에서 나온 토픽이 여러 관심사에 걸치면 하나로 합치고 태그를 모은다.
  const byKey = new Map<string, Topic>();
  for (const t of perInterest.flat()) {
    const key = t.source_titles[0] ?? t.headline;
    const prev = byKey.get(key);
    if (prev) prev.interests = [...new Set([...prev.interests, ...t.interests])];
    else byKey.set(key, t);
  }

  return { date, topics: [...byKey.values()], generatedAt: new Date().toISOString(), mode: client ? "gemini" : "template" };
}
