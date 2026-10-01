// 나의 성향: 내향 정도(4단계 중 선택)와 팀 분위기. 가(라)톡·스몰토크 생존기에서 말투와 난이도를 맞추는 데 쓴다.

// 내향 정도 1~4. 처음 성향 조사에서 하나 고른다. 단계마다 캐릭터가 있다 (public/characters).
export const INTROVERT_LEVELS = [
  { level: 1, name: "노력형", desc: "어색해도 먼저 말 걸어보려고 애쓰는 타입이에요", image: "/characters/level1.png" },
  { level: 2, name: "생존형", desc: "필요한 만큼만 말하면서 무사히 살아남는 타입이에요", image: "/characters/level2.png" },
  { level: 3, name: "무관심형", desc: "남 일엔 별 관심 없고 내 할 일 하는 타입이에요", image: "/characters/level3.png" },
  { level: 4, name: "자발적 아싸", desc: "혼자가 편해서 일부러 혼자인 타입이에요", image: "/characters/level4.png" },
] as const;

// 상황별 그림: peer 또래랑 밥 먹을 때, senior 윗사람이 끼어 있을 때, news 뉴스 보여줄 때
export type Scene = "peer" | "senior" | "news";
export const sceneImage = (n: number, scene: Scene) => `/characters/level${introvertLevel(n).level}-${scene}.png`;

// 예전 테스트 점수(0~5)로 저장된 값도 1~4 안으로 맞춘다.
export const introvertLevel = (n: number) => INTROVERT_LEVELS[Math.max(1, Math.min(4, Math.round(n))) - 1];

export const TEAM_MOODS = ["close", "normal", "awkward", "strict"] as const;
export type TeamMood = (typeof TEAM_MOODS)[number];

export const TEAM_MOOD_LABEL: Record<TeamMood, string> = {
  close: "친해요",
  normal: "무난해요",
  awkward: "어색해요",
  strict: "살얼음판",
};

// 성향 조사 결과 화면 한마디
export const TEAM_MOOD_SYMPATHY: Record<TeamMood, string> = {
  close: "다들 친한 팀에서 은근 힘드시겠군요!",
  normal: "무난한 팀이어도 점심은 힘드시겠군요!",
  awkward: "어색한 팀에서 많이 힘드시겠군요!",
  strict: "살얼음판 같은 팀에서 많이 힘드시겠군요!",
};

// 프롬프트에 넣을 설명
export const TEAM_MOOD_DESC: Record<TeamMood, string> = {
  close: "서로 친하고 편하게 농담도 하는 팀",
  normal: "무난하고 예의 바른 보통 팀",
  awkward: "서로 아직 어색하고 말이 적은 팀",
  strict: "살얼음판처럼 분위기가 딱딱하고 다들 눈치 보는 팀",
};
