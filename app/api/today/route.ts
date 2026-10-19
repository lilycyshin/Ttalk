// 키워드별 탭 공용 풀. 관심사 전체를 서버가 미리 만들어 두고 바로 돌려준다 (관심사·연령대 고르기는 앱에서).
// 만든 지 50분이 넘으면 지금 가진 걸 먼저 주고 뒤에서 새로 만든다. 1시간마다 GitHub Actions가 불러서 깨운다
// (.github/workflows/refresh.yml). 배포 직후처럼 아직 만든 게 없을 때만 기다린다.
// 연령대별 검색 관심도(네이버 데이터랩)는 하루 1,000회 한도라 4시간마다 따로 재서 붙인다. 그 사이 새로 나온 키워드는 점수 없음.
import { unstable_cache } from "next/cache";
import { buildToday } from "@/lib/news/today";
import { scoreAges, type AgeScores } from "@/lib/news/agescore";

export const dynamic = "force-dynamic";
// 뉴스 검색 수십 번 + 데이터랩 백수십 번이라 보통 몇 초~수십 초.
export const maxDuration = 60;

const pool = unstable_cache(() => buildToday(), ["today-pool-v2"], { revalidate: 3000 });
const ages = unstable_cache(
  async () => {
    const { items } = await pool();
    // 기사가 많은 키워드부터 (상한을 넘으면 뒤쪽은 안 잰다)
    return scoreAges([...items].sort((a, b) => b.size - a.size).map((i) => i.keyword));
  },
  ["age-scores-v1"],
  { revalidate: 4 * 3600 },
);

export async function GET() {
  try {
    const [p, a] = await Promise.all([pool(), ages().catch((e) => ({ scores: {} as AgeScores, errors: [String(e?.message ?? e)], at: "" }))]);
    const items = p.items.map((i) => (a.scores[i.keyword] ? { ...i, ages: a.scores[i.keyword] } : i));
    return Response.json({ ...p, items, ageScore: { at: a.at, errors: a.errors } }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("today failed:", e);
    // 원인 확인용으로 짧은 이유를 같이 준다 (키 값은 들어가지 않는다).
    const detail = e instanceof Error ? e.message.slice(0, 400) : String(e);
    return Response.json({ error: "news unavailable", detail }, { status: 503 });
  }
}
