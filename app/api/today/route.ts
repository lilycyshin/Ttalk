// 실시간 오늘의 토픽. 앱을 열 때마다 사용자가 고른 관심사만 새로 수집하고 멘트를 만든다. 캐시 없음.
// GET /api/today?i=baseball,soccer&a=30s,50s_plus  (i: 관심사, a: 같이 먹는 사람 연령대)
import { AGE_GROUPS, INTERESTS, type AgeGroup } from "@/lib/topics";
import { buildToday } from "@/lib/news/today";
import type { InterestId } from "@/lib/news/sources";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VALID = new Set<string>(INTERESTS.map((i) => i.id));

export async function GET(req: Request) {
  const asked = (new URL(req.url).searchParams.get("i") ?? "").split(",").filter((x) => VALID.has(x));
  const interests = (asked.length ? asked : [...VALID]) as InterestId[];
  const ages = (new URL(req.url).searchParams.get("a") ?? "")
    .split(",")
    .filter((x): x is AgeGroup => (AGE_GROUPS as readonly string[]).includes(x));
  try {
    return Response.json(await buildToday(interests, ages), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("today failed:", e);
    // 원인 확인용으로 짧은 이유를 같이 준다 (키 값은 들어가지 않는다).
    const detail = e instanceof Error ? e.message.slice(0, 400) : String(e);
    return Response.json({ error: "news unavailable", detail }, { status: 503 });
  }
}
