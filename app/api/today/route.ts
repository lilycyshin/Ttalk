// 오늘의 토픽 공용 풀. 관심사 전체를 서버가 미리 만들어 두고 바로 돌려준다 (관심사·연령대 고르기는 앱에서).
// Gemini 비용 때문에 3시간마다 새로 만든다: 만든 지 2시간 50분이 넘으면 지금 가진 걸 먼저 주고 뒤에서 새로 만든다.
// GitHub Actions가 낮 시간에 1시간마다 부르지만 실제로 새로 만드는 건 3번에 1번
// (.github/workflows/refresh.yml). 배포 직후처럼 아직 만든 게 없을 때만 기다린다.
import { unstable_cache } from "next/cache";
import { buildToday } from "@/lib/news/today";

export const dynamic = "force-dynamic";
// 관심사 전체(Gemini 17번)를 만드는 데 1분이 넘을 수 있다.
export const maxDuration = 300;

const cached = unstable_cache(() => buildToday(), ["today-pool-v1"], { revalidate: 3 * 3600 - 600 });

export async function GET() {
  try {
    return Response.json(await cached(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("today failed:", e);
    // 원인 확인용으로 짧은 이유를 같이 준다 (키 값은 들어가지 않는다).
    const detail = e instanceof Error ? e.message.slice(0, 400) : String(e);
    return Response.json({ error: "news unavailable", detail }, { status: 503 });
  }
}
