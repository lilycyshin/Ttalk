// 스몰토크 생존기: 회사에서 1:1로 마주치는 상황과 리허설 상대.

export const SCENARIOS = [
  { id: "meeting_early", title: "미팅 전 회의실", desc: "회의실에 일찍 왔는데 한 명만 먼저 와 있다. 다른 사람들 오기까지 5분." },
  { id: "elevator", title: "엘리베이터 단둘이", desc: "1층에서 같이 탔다. 내 층까지 10층." },
  { id: "pantry", title: "탕비실 커피", desc: "커피 내리는데 옆에 와서 컵을 꺼낸다." },
  { id: "monday", title: "월요일 아침 로비", desc: "출근길 로비에서 눈이 마주쳤다. 같은 방향이다." },
  { id: "lunch_line", title: "식당 줄", desc: "점심 식당 줄에서 앞뒤로 섰다. 앞에 다섯 팀." },
  { id: "commute", title: "퇴근길 같은 방향", desc: "회사에서 지하철역까지 같이 걷게 됐다. 걸어서 7분." },
  { id: "dinner", title: "회식 옆자리", desc: "회식에서 옆자리가 됐다. 다들 다른 얘기 중이다." },
  { id: "video_call", title: "화상회의 대기실", desc: "화상회의에 둘만 먼저 들어왔다. 카메라는 켜져 있다." },
] as const;
export type ScenarioId = (typeof SCENARIOS)[number]["id"];

export const PARTNERS = [
  { id: "lead", label: "팀장님", desc: "40대 팀장. 바쁘지만 나쁜 사람은 아님" },
  { id: "senior", label: "선배", desc: "30대 선배. 일 잘하고 말수는 보통" },
  { id: "peer", label: "동기", desc: "입사 동기. 친해질 듯 말 듯한 사이" },
  { id: "junior", label: "후배", desc: "20대 후배. 예의 바르지만 아직 어색함" },
  { id: "stranger", label: "다른 부서", desc: "얼굴만 아는 다른 부서 사람" },
] as const;
export type PartnerId = (typeof PARTNERS)[number]["id"];

// 내가 답하는 횟수. 이만큼 답하면 리허설이 끝나고 피드백이 나온다.
export const REHEARSAL_TURNS = 3;
