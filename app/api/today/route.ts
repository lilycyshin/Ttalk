// 키워드별 탭 공용 풀. 관심사 전체를 서버가 미리 만들어 두고 바로 돌려준다 (관심사 고르기는 앱에서).
// 만든 지 50분이 넘으면 지금 가진 걸 먼저 주고 뒤에서 새로 만든다. 1시간마다 GitHub Actions가 불러서 깨운다
// (.github/workflows/refresh.yml). 배포 직후처럼 아직 만든 게 없을 때만 기다린다.
import { unstable_cache } from "next/cache";
import { buildToday } from "@/lib/news/today";

export const dynamic = "force-dynamic";
// 뉴스 검색 수십 번이라 보통 몇 초지만 느린 검색이 있으면 길어진다.
export const maxDuration = 60;

const cached = unstable_cache(() => buildToday(), ["today-pool-v2"], { revalidate: 3000 });

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
