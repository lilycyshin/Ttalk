// 스몰토크로 꺼내기 곤란한 기사 거르기 (실검·키워드별 탭 공통).
import type { Candidate } from "./sources";

// 제목에 이런 말이 있으면 점심에 꺼내기 곤란하다.
const AVOID =
  /사망|숨져|숨진|별세|부고|살인|피살|사고|참사|화재|추락|폭행|범죄|성범죄|구속|기소|검찰|경찰|재판|징역|혐의|탄핵|대통령|국회|의원|여당|야당|정당|선거|전쟁|북한|김정은|테러|자살|죽고 싶|극단적|투병|학대|논란|갈등|광고|이벤트 당첨|\[포토\]|\[사진\]|포토/;

// 지자체 보도자료("전주시, ...", "郡, ...")와 한글이 거의 없는 제목도 뺀다.
const PRESS_RELEASE = /^([가-힣]{1,6}\s)?([가-힣]{1,6}(시|군|구|도|청|면|읍)|郡|市|道)\s*[,，·]/;
const hangulRatio = (s: string) => (s.match(/[가-힣]/g)?.length ?? 0) / Math.max(s.replace(/\s/g, "").length, 1);

export const isSmallTalkSafe = (c: Candidate) =>
  !AVOID.test(c.title) && !PRESS_RELEASE.test(c.title) && hangulRatio(c.title) > 0.4;

// 트렌드 탭: 사건·사고·정치처럼 점심에 꺼내기 곤란한 제목인지
export const isAwkwardTitle = (title: string) => AVOID.test(title);
