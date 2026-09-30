// 실시간 오늘의 토픽. 앱을 열 때마다 사용자가 고른 관심사만 새로 수집하고 멘트를 만든다. 캐시 없음.
// GET /api/today?i=baseball,soccer
import { INTERESTS } from "@/lib/topics";
import { buildToday } from "@/lib/news/today";
import type { InterestId } from "@/lib/news/sources";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VALID = new Set<string>(INTERESTS.map((i) => i.id));

export async function GET(req: Request) {
  const asked = (new URL(req.url).searchParams.get("i") ?? "").split(",").filter((x) => VALID.has(x));
  const interests = (asked.length ? asked : [...VALID]) as InterestId[];
  try {
    return Response.json(await buildToday(interests), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("today failed:", e);
    return Response.json({ error: "news unavailable" }, { status: 503 });
  }
}
