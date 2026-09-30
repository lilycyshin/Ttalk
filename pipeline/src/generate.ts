// 후보 뉴스 → 오늘의 토픽 풀 (관심사/연령 태그 + 상대 연령대별 멘트). 하루 1회 호출.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Candidate } from "./sources";

// 온보딩 화면에서 고르는 관심사. 앱과 파이프라인이 같은 목록을 공유한다.
export const INTERESTS = [
  "sports", "baseball", "soccer", "entertainment", "drama_movie", "music",
  "real_estate", "stocks_economy", "tech_it", "food", "travel", "weather_season",
  "health", "parenting", "pets", "office_life", "games",
] as const;
export const AGE_GROUPS = ["20s", "30s", "40s", "50s_plus"] as const;

const Opener = z.object({
  opener: z.string().describe("점심 자리에서 바로 꺼낼 첫 마디. 한두 문장, 질문형"),
  follow_up: z.string().describe("상대가 반응했을 때 이어갈 한 마디"),
});

export const TopicSchema = z.object({
  headline: z.string().describe("카드 제목, 20자 이내"),
  summary: z.string().describe("대화 전에 알아둘 사실 1~2문장. 후보 제목에 없는 사실은 쓰지 않는다"),
  interests: z.array(z.enum(INTERESTS)).describe("해당 관심사 1~3개"),
  age_fit: z.array(z.enum(AGE_GROUPS)).describe("이 주제에 반응이 좋을 상대 연령대"),
  source_titles: z.array(z.string()).describe("근거가 된 후보 제목"),
  openers: z.object({
    "20s": Opener,
    "30s": Opener,
    "40s": Opener,
    "50s_plus": Opener,
  }),
});
export const DailySchema = z.object({ topics: z.array(TopicSchema) });
export type Daily = z.infer<typeof DailySchema>;

export const SYSTEM = `너는 내향적인 직장인이 점심시간에 회사 사람들과 가볍게 나눌 스몰토크 주제를 고르는 편집자다.

고르는 기준:
- 누구나 부담 없이 반응할 수 있는 주제 (스포츠 경기 결과, 예능/드라마, 날씨·계절, 생활 정책 변화, 부동산·주식 화제, 신제품, 음식 트렌드).
- 제외: 정치 갈등, 사건·사고·범죄·사망, 재난 피해, 종교, 성별·세대 갈등, 특정인 사생활 폭로. 후보 중 이런 건 아무리 검색량이 높아도 뺀다.
- 서로 다른 관심사를 골고루 덮는다. 같은 사건은 하나로 합친다.

멘트 규칙:
- 존댓말. 상대 연령대에 맞춘다. 20s는 동기·후배에게 쓰는 가벼운 말투, 30s·40s는 편한 선배에게, 50s_plus는 부장님급에게 예의 있게 묻는 말투.
- "오늘 아시안게임 보셨어요?"처럼 상대가 한 마디로 답할 수 있는 질문으로 시작한다.
- 의견을 강요하거나 논쟁을 부르는 질문은 하지 않는다 (예: "집값 떨어져야죠?" 금지).
- 후보 제목에 없는 사실(점수, 수치, 이름)을 지어내지 않는다.`;

export function buildPrompt(cands: Candidate[], date: string, count: number): string {
  const lines = cands.map((c, i) => {
    const extra = [c.traffic && `검색량 ${c.traffic}`, c.related?.length && `관련: ${c.related.join(" / ")}`]
      .filter(Boolean).join(" | ");
    return `${i + 1}. [${c.source}] ${c.title}${extra ? ` (${extra})` : ""}`;
  });
  return `오늘은 ${date}. 아래 후보에서 스몰토크 토픽 ${count}개를 골라라.\n\n${lines.join("\n")}`;
}

export async function generateDaily(cands: Candidate[], date: string, count = 12) {
  const client = new Anthropic();
  const res = await client.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(DailySchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: buildPrompt(cands, date, count) }],
  });
  if (res.stop_reason === "refusal") throw new Error("refused");
  if (!res.parsed_output) throw new Error(`parse failed (stop_reason=${res.stop_reason})`);
  return { daily: res.parsed_output, usage: res.usage };
}
