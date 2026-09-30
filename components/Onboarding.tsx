"use client";
import { useState } from "react";
import Mascot from "./Mascot";
import { AGE_GROUPS, AGE_LABEL, INTERESTS, type AgeGroup, type Profile } from "@/lib/topics";

const STEPS = [
  { title: "연령대가 어떻게 되세요?", sub: "말투 맞출 때만 써요", bubble: "점심시간 어색한 거, 제가 좀 도와드릴게요" },
  { title: "오늘 어떤 분이랑 식사하세요?", sub: "여러 명이면 다 골라주세요", bubble: "팀장님이랑? 아니면 동기랑?" },
  { title: "요즘 관심 있는 거 골라주세요", sub: "여러 개 골라도 돼요", bubble: "아는 얘기 나와야 덜 어색하잖아요" },
];

export default function Onboarding({ initial, onDone }: { initial?: Profile | null; onDone: (p: Profile) => void }) {
  const [step, setStep] = useState(0);
  const [myAge, setMyAge] = useState<AgeGroup | null>(initial?.myAge ?? null);
  const [targetAges, setTargetAges] = useState<AgeGroup[]>(initial?.targetAges ?? []);
  const [interests, setInterests] = useState<string[]>(initial?.interests ?? []);
  const s = STEPS[step];

  const toggleIn = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);

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

      {step === 0 && (
        <div className="grid2">
          {AGE_GROUPS.map((a) => (
            <button
              key={a}
              className={myAge === a ? "btn big selected" : "btn big"}
              onClick={() => {
                setMyAge(a);
                setStep(1);
              }}
            >
              {AGE_LABEL[a]}
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
                onClick={() => setTargetAges((xs) => toggleIn(xs, a))}
                aria-pressed={targetAges.includes(a)}
              >
                {AGE_LABEL[a]}
              </button>
            ))}
          </div>
          <div className="bottom">
            <button className="btn primary wide" disabled={targetAges.length === 0} onClick={() => setStep(2)}>
              {targetAges.length === 0 ? "한 분은 골라주세요" : "다음"}
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
                onClick={() => setInterests((xs) => toggleIn(xs, i.id))}
                aria-pressed={interests.includes(i.id)}
              >
                {i.label}
              </button>
            ))}
          </div>
          <div className="bottom">
            <button
              className="btn primary wide"
              disabled={interests.length === 0 || !myAge || targetAges.length === 0}
              onClick={() => myAge && onDone({ myAge, targetAges: sortAges(targetAges), interests })}
            >
              {interests.length === 0 ? "하나는 골라주세요" : `시작할게요 (${interests.length}개)`}
            </button>
          </div>
        </>
      )}

      {step > 0 && (
        <button className="link" onClick={() => setStep(step - 1)}>
          이전으로
        </button>
      )}
    </main>
  );
}

const sortAges = (xs: AgeGroup[]) => AGE_GROUPS.filter((a) => xs.includes(a));
