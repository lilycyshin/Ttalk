"use client";
import { useState } from "react";
import Mascot from "./Mascot";
import { AGE_GROUPS, AGE_LABEL, INTERESTS, type AgeGroup, type Profile } from "@/lib/topics";

const STEPS = [
  { title: "나는 몇 살대예요?", sub: "말투를 맞추는 데만 써요", bubble: "안녕하세요! 점심 멘트 챙겨드릴게요" },
  { title: "주로 누구랑 점심 먹어요?", sub: "상대 나이에 맞는 멘트를 골라줘요", bubble: "부장님이랑 드세요? 동기랑 드세요?" },
  { title: "관심 있는 걸 골라요", sub: "여러 개 골라도 돼요", bubble: "아는 얘기가 나와야 덜 떨려요" },
];

export default function Onboarding({ initial, onDone }: { initial?: Profile | null; onDone: (p: Profile) => void }) {
  const [step, setStep] = useState(0);
  const [myAge, setMyAge] = useState<AgeGroup | null>(initial?.myAge ?? null);
  const [targetAge, setTargetAge] = useState<AgeGroup | null>(initial?.targetAge ?? null);
  const [interests, setInterests] = useState<string[]>(initial?.interests ?? []);
  const s = STEPS[step];

  const pickAge = (a: AgeGroup) => {
    if (step === 0) setMyAge(a);
    else setTargetAge(a);
    setStep(step + 1);
  };
  const toggle = (id: string) =>
    setInterests((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));

  return (
    <main className="screen">
      <div className="dots" aria-label={`${step + 1} / 3 단계`}>
        {STEPS.map((_, i) => (
          <span key={i} className={i <= step ? "dot on" : "dot"} />
        ))}
      </div>

      <Mascot size={100} say={s.bubble} />
      <h1 className="title">{s.title}</h1>
      <p className="sub">{s.sub}</p>

      {step < 2 ? (
        <div className="grid2">
          {AGE_GROUPS.map((a) => {
            const selected = (step === 0 ? myAge : targetAge) === a;
            return (
              <button key={a} className={selected ? "btn big selected" : "btn big"} onClick={() => pickAge(a)}>
                {AGE_LABEL[a]}
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className="chips">
            {INTERESTS.map((i) => (
              <button
                key={i.id}
                className={interests.includes(i.id) ? "chip on" : "chip"}
                onClick={() => toggle(i.id)}
                aria-pressed={interests.includes(i.id)}
              >
                <span aria-hidden>{i.emoji}</span> {i.label}
              </button>
            ))}
          </div>
          <div className="bottom">
            <button
              className="btn primary wide"
              disabled={interests.length === 0 || !myAge || !targetAge}
              onClick={() => myAge && targetAge && onDone({ myAge, targetAge, interests })}
            >
              {interests.length === 0 ? "하나 이상 골라주세요" : `시작하기 (${interests.length}개)`}
            </button>
          </div>
        </>
      )}

      {step > 0 && (
        <button className="link" onClick={() => setStep(step - 1)}>
          ← 이전
        </button>
      )}
    </main>
  );
}
