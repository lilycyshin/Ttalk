// Gemini API 키가 없거나 생성이 실패했을 때: 기사 제목으로 멘트를 틀에 맞춰 만든다. 말투는 LLM보다 단조롭다.
import { AGE_GROUPS, INTERESTS, type Topic } from "@/lib/topics";
import type { Candidate } from "./sources";
import { cluster } from "./similar";

// 스몰토크로 꺼내기 곤란한 기사는 제목 키워드로 거른다. LLM 경로에서는 프롬프트가 같은 일을 한다.
const AVOID =
  /사망|숨져|숨진|별세|부고|살인|피살|사고|참사|화재|추락|폭행|범죄|성범죄|구속|기소|검찰|경찰|재판|징역|혐의|탄핵|대통령|국회|의원|여당|야당|정당|선거|전쟁|북한|김정은|테러|자살|죽고 싶|극단적|투병|학대|논란|갈등|광고|이벤트 당첨|\[포토\]|\[사진\]|포토/;

// 지자체 보도자료("전주시, ...", "郡, ...")와 한글이 거의 없는 제목도 뺀다.
const PRESS_RELEASE = /^([가-힣]{1,6}\s)?([가-힣]{1,6}(시|군|구|도|청|면|읍)|郡|市|道)\s*[,，·]/;
const hangulRatio = (s: string) => (s.match(/[가-힣]/g)?.length ?? 0) / Math.max(s.replace(/\s/g, "").length, 1);

export const isSmallTalkSafe = (c: Candidate) =>
  !AVOID.test(c.title) && !PRESS_RELEASE.test(c.title) && hangulRatio(c.title) > 0.4;

// 트렌드 탭: 사건·사고·정치처럼 점심에 꺼내기 곤란한 제목인지
export const isAwkwardTitle = (title: string) => AVOID.test(title);

// 기사 제목의 앞부분만 따서 말로 꺼내기 좋게: 말줄임표 앞까지, 따옴표 제거, 최대 25자.
function topicPhrase(title: string) {
  const head = title.split(/…|\.\.\.|\s-\s/)[0].replace(/["'‘’“”「」『』]/g, "").trim();
  return head.length > 25 ? `${head.slice(0, 25).trim()}…` : head;
}

export function fallbackTopics(interestCands: Candidate[], count = 5): Topic[] {
  // 같은 사건 기사는 하나만
  return cluster(interestCands.filter(isSmallTalkSafe), (c) => c.title)
    .map((g) => g[0])
    .slice(0, count)
    .map((c) => {
      const label = INTERESTS.find((i) => i.id === c.interest)!.label;
      const short = topicPhrase(c.title);
      const soft = { opener: `${short}, 혹시 들으셨어요?`, follow_up: `요즘 ${label} 쪽 관심 있으세요?` };
      return {
        headline: c.title.length > 24 ? `${c.title.slice(0, 23)}…` : c.title,
        summary: c.description || "자세한 내용은 아래 원문 기사에서 볼 수 있어요.",
        interests: [c.interest],
        age_fit: [...AGE_GROUPS],
        source_titles: [c.title],
        openers: {
          "20s": { opener: `${short}, 혹시 들었어요?`, follow_up: `요즘 ${label} 쪽 관심 있어요?` },
          "30s": soft,
          "40s": soft,
          "50s_plus": soft,
        },
      };
    });
}
