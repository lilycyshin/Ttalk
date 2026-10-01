"use client";
import { useState } from "react";
import Mascot from "./Mascot";
import Typewriter from "./Typewriter";
import { AGE_GROUPS, AGE_LABEL, INTERESTS, type AgeGroup, type Profile } from "@/lib/topics";
import { INTROVERT_LEVELS, TEAM_MOODS, TEAM_MOOD_LABEL, TEAM_MOOD_SYMPATHY, introvertLevel, type TeamMood } from "@/lib/persona";

// 관심사는 최대 이만큼만 고를 수 있다.
const MAX_INTERESTS = 3;

// 단계 번호: 0 내 연령대, 1 같이 먹는 사람, 2 관심사, 3 내향 정도, 4 팀 분위기, 5 사전 조사 안내, 6 결과, 7 이름
const STEPS: Record<number, { title: string; sub: string; bubble: string }> = {
  0: { title: "연령대가 어떻게 되세요?", sub: "", bubble: "먼저 나의 성향부터 알아볼게요" },
  1: { title: "오늘 어떤 분이랑 식사하세요?", sub: "여러 명이면 다 골라주세요", bubble: "같이 먹는 분에 따라 뉴스를 골라볼게요" },
  2: { title: "요즘 관심 있는 거 골라주세요", sub: "최대 3개까지 골라주세요", bubble: "아는 얘기 나와야 덜 어색하잖아요" },
  3: { title: "어느 정도 내향형이신가요?", sub: "제일 가까운 걸 골라주세요", bubble: "솔직하게 골라주세요. 아무도 안 봐요" },
  4: { title: "우리 팀 분위기는 어때요?", sub: "리허설 상대 말투를 맞출게요", bubble: "팀마다 공기가 다르잖아요" },
  5: { title: "먼저 당신의 사전 정보를 조사해볼게요!", sub: "30초면 끝나요", bubble: "안녕하세요! 내향인 생존 도우미예요" },
  6: { title: "", sub: "", bubble: "조사 끝! 이제 같이 살아남아 봐요" },
  7: { title: "뭐라고 불러드리면 될까요?", sub: "이름이나 별명을 적어주세요", bubble: "" },
};

// 처음 성향 설정: [5, 7, 0, 3, 4, 6]. 키워드별 탭에서 매일: [1] (관심사가 없으면 [1, 2]). 키워드만 바꿀 땐 [2].
// embedded: 탭 안에 들어갈 때 (화면 전체 레이아웃 없이)
export default function Onboarding({
  initial,
  steps = [5, 7, 0, 3, 4, 6],
  embedded = false,
  onDone,
}: {
  initial?: Profile | null;
  steps?: number[];
  embedded?: boolean;
  onDone: (p: Profile) => void;
}) {
  const [pos, setPos] = useState(0);
  const [myAge, setMyAge] = useState<AgeGroup | null>(initial?.myAge ?? null);
  const [targetAges, setTargetAges] = useState<AgeGroup[]>(initial?.targetAges ?? []);
  const [interests, setInterests] = useState<string[]>((initial?.interests ?? []).slice(0, MAX_INTERESTS));
  const [introversion, setIntroversion] = useState<number | undefined>(initial?.introversion);
  const [teamMood, setTeamMood] = useState<TeamMood | null>(initial?.teamMood ?? null);
  // 이름 칸엔 아무 의미 없는 랜덤 이름을 미리 넣어 둔다 (그대로 써도 되고 바꿔도 된다).
  const [nickname, setNickname] = useState(() => initial?.nickname ?? randomName());
  // 같이 먹는 사람을 고를 때 캐릭터 반응. 없으면 단계 기본 말풍선.
  const [reaction, setReaction] = useState<string | null>(null);
  const step = steps[pos];
  const isLast = pos === steps.length - 1;

  const s = STEPS[step];
  const level = introvertLevel(introversion ?? 2);
  const title = step === 6 ? TEAM_MOOD_SYMPATHY[teamMood ?? "normal"] : s.title;
  const mascotSrc = level.image;
  const name = nickname.trim();
  const sub = step === 6 ? `${name ? `${name}님은 ` : ""}${level.name}! 앞으로 제가 도움을 드릴게요.` : s.sub;

  const toggleIn = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);
  const goTo = (n: number) => {
    setReaction(null);
    setPos(n);
  };
  // 이번에 묻지 않은 항목은 원래 값을 그대로 둔다.
  const finish = () =>
    myAge &&
    onDone({
      myAge,
      targetAges: sortAges(targetAges),
      interests,
      introversion,
      teamMood: teamMood ?? undefined,
      nickname: name || undefined,
    });
  const next = () => (isLast ? finish() : goTo(pos + 1));
  // 바로 넘어가는 선택: 고른 버튼 색이 바뀐 걸 잠깐 보여주고 넘어간다.
  const pickThenNext = (apply: () => void) => {
    apply();
    setTimeout(() => (isLast ? undefined : goTo(pos + 1)), 350);
  };
  const toggleInterest = (id: string) =>
    setInterests((xs) => (xs.includes(id) || xs.length < MAX_INTERESTS ? toggleIn(xs, id) : xs));
  const toggleTarget = (a: AgeGroup) => {
    const adding = !targetAges.includes(a);
    setTargetAges((xs) => toggleIn(xs, a));
    if (adding && myAge) setReaction(ageReaction(myAge, a));
  };
  const back = () => goTo(pos - 1);

  return (
    <Wrap embedded={embedded}>
      {steps.length > 1 ? (
        <div className="dots" aria-label={`${pos + 1} / ${steps.length} 단계`}>
          {steps.map((_, i) => (
            <span key={i} className={i <= pos ? "dot on" : "dot"} />
          ))}
        </div>
      ) : (
        <div className="dots-spacer" />
      )}

      {/* 성향 조사 중에는 캐릭터 없이. 결과부터, 그리고 성향을 아는 뒤 단계(키워드별 탭)에선 내 캐릭터. */}
      {introversion !== undefined && (step === 6 || initial?.introversion !== undefined) ? (
        <Mascot size={100} say={reaction ?? s.bubble} src={mascotSrc} />
      ) : (
        <div className="setup-spacer" />
      )}
      <h1 className="title">
        <Typewriter text={title} />
      </h1>
      {sub ? <p className="sub">{sub}</p> : <div className="sub-gap" />}

      {(step === 5 || step === 6) && (
        <div className="bottom">
          {step === 6 && (
            <div className="result-card">
              <p>
                <b>내향 정도</b> {level.name}
              </p>
              <p>
                <b>팀 분위기</b> {teamMood ? TEAM_MOOD_LABEL[teamMood] : "-"}
              </p>
            </div>
          )}
          <button className="btn primary wide" onClick={next}>
            시작하기
          </button>
        </div>
      )}

      {step === 7 && (
        <form
          className="name-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (name) next();
          }}
        >
          <input
            className="name-input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="예: 집크크"
            onFocus={(e) => e.target.select()}
            maxLength={12}
            autoFocus
            aria-label="불러드릴 이름"
          />
          <div className="bottom">
            <button className="btn primary wide" disabled={!name}>
              {name ? "다음" : "이름을 적어주세요"}
            </button>
          </div>
        </form>
      )}

      {step === 0 && (
        <div className="grid2">
          {AGE_GROUPS.map((a) => (
            <button
              key={a}
              className={myAge === a ? "btn big selected" : "btn big"}
              onClick={() => pickThenNext(() => setMyAge(a))}
              aria-pressed={myAge === a}
            >
              {AGE_LABEL[a]}
            </button>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="levels">
          {INTROVERT_LEVELS.map((l) => (
            <button
              key={l.level}
              className={introversion === l.level ? "level selected" : "level"}
              onClick={() => pickThenNext(() => setIntroversion(l.level))}
              aria-pressed={introversion === l.level}
            >
              <img src={l.image} alt="" className="level-img" />
              <span className="level-text">
                <b>{l.name}</b>
                <span>{l.desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {step === 4 && (
        <div className="grid2">
          {TEAM_MOODS.map((m) => (
            <button
              key={m}
              className={teamMood === m ? "btn big selected" : "btn big"}
              onClick={() => pickThenNext(() => setTeamMood(m))}
              aria-pressed={teamMood === m}
            >
              {TEAM_MOOD_LABEL[m]}
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <>
          <div className="grid2">
            {AGE_GROUPS.map((a) => (
              <button
                key={a}
                className={targetAges.includes(a) ? "btn big selected" : "btn big"}
                onClick={() => toggleTarget(a)}
                aria-pressed={targetAges.includes(a)}
              >
                {AGE_LABEL[a]}
              </button>
            ))}
          </div>
          <div className="bottom">
            <button className="btn primary wide" disabled={targetAges.length === 0} onClick={next}>
              {targetAges.length === 0 ? "한 분 이상 골라주세요" : isLast ? "오늘 뉴스 보기" : "다음"}
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="chips">
            {INTERESTS.map((i) => (
              <button
                key={i.id}
                className={interests.includes(i.id) ? "chip on" : "chip"}
                onClick={() => toggleInterest(i.id)}
                disabled={!interests.includes(i.id) && interests.length >= MAX_INTERESTS}
                aria-pressed={interests.includes(i.id)}
              >
                {i.label}
              </button>
            ))}
          </div>
          <div className="bottom">
            <button className="btn primary wide" disabled={interests.length === 0} onClick={next}>
              {interests.length === 0 ? "하나는 골라주세요" : isLast ? `시작할게요 (${interests.length}/${MAX_INTERESTS})` : "다음"}
            </button>
          </div>
        </>
      )}

      {pos > 0 && (
        <button className="link" onClick={back}>
          이전으로
        </button>
      )}
    </Wrap>
  );
}

const Wrap = ({ embedded, children }: { embedded: boolean; children: React.ReactNode }) =>
  embedded ? (
    <div className="embedded-step">{children}</div>
  ) : (
    <main className="screen">{children}</main>
  );

// 랜덤 이름: "수줍은 감자" 같은 아무 말
const NAME_ADJ = ["수줍은", "조용한", "느긋한", "소심한", "말없는", "졸린", "배고픈", "눈치보는", "퇴근하고픈", "혼밥하는", "멍때리는", "낯가리는"];
const NAME_NOUN = ["감자", "두부", "고양이", "펭귄", "만두", "오리", "너구리", "햄스터", "김밥", "곰돌이", "수달", "호빵"];
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const randomName = () => `${pick(NAME_ADJ)} ${pick(NAME_NOUN)}`;

const sortAges = (xs: AgeGroup[]) => AGE_GROUPS.filter((a) => xs.includes(a));

// 내 연령대와 비교한 한마디
function ageReaction(mine: AgeGroup, target: AgeGroup) {
  const d = AGE_GROUPS.indexOf(target) - AGE_GROUPS.indexOf(mine);
  if (d === 0) return "동기점 좋죠!";
  if (d > 0) return "오늘 점심은 쉽지 않겠네요";
  return "영크크에게 무시당하지 맙시다!";
}
