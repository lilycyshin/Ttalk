// 실시간 오늘의 토픽. 뉴스 수집과 멘트 생성은 비싸서 결과를 REFRESH_HOURS 동안 캐시하고,
// 그 뒤 첫 요청이 오면 옛 결과를 먼저 주고 뒤에서 새로 만든다.
import { unstable_cache } from "next/cache";
import { buildToday } from "@/lib/news/today";

const REFRESH_HOURS = 3;

const cachedToday = unstable_cache(buildToday, ["today-live-v3"], { revalidate: REFRESH_HOURS * 3600 });

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  try {
    return Response.json(await cachedToday());
  } catch (e) {
    console.error("today failed:", e);
    return Response.json({ error: "news unavailable" }, { status: 503 });
  }
}
