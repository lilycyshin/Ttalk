"use client";
import { useEffect, useRef, useState } from "react";
import { PARTNERS, REHEARSAL_TURNS, SCENARIOS, type PartnerId, type ScenarioId } from "@/lib/scenarios";
import type { Profile } from "@/lib/topics";

type Msg = { from: "me" | "them"; text: string };
type Feedback = { score: number; good: string; tip: string };

// 스몰토크 생존기: 상황과 상대를 고르면 Gemini가 상대 역할로 리허설해 준다.
// 제안 멘트를 누르거나 직접 써서 답하고, REHEARSAL_TURNS번 답하면 피드백.
export default function Game({ profile }: { profile: Profile }) {
  const [scenario, setScenario] = useState<ScenarioId | null>(null);
  const [partner, setPartner] = useState<PartnerId | null>(null);
  const [history, setHistory] = useState<Msg[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [text, setText] = useState("");
  const [round, setRound] = useState(0); // "한 번 더"로 같은 상대와 다시 시작할 때 바뀐다
  const endRef = useRef<HTMLDivElement>(null);

  const sc = SCENARIOS.find((s) => s.id === scenario);
  const pt = PARTNERS.find((p) => p.id === partner);
  const myTurns = history.filter((m) => m.from === "me").length;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history, feedback, loading]);

  const ask = async (h: Msg[]) => {
    if (!scenario || !partner) return;
    setLoading(true);
    setError(false);
    setSuggestions([]);
    try {
      const r = await fetch("/api/rehearse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario,
          partner,
          history: h,
          introversion: profile.introversion,
          teamMood: profile.teamMood,
        }),
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setHistory([...h, { from: "them", text: d.line }]);
      setSuggestions(d.suggestions ?? []);
      if (d.done) setFeedback(d.feedback ?? { score: 3, good: "끝까지 해냈어요.", tip: "되묻는 질문 하나만 챙겨가요." });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const start = (p: PartnerId) => {
    setPartner(p);
    setHistory([]);
    setFeedback(null);
    setRound((n) => n + 1);
  };
  useEffect(() => {
    if (scenario && partner && history.length === 0 && !feedback) ask([]);
  }, [scenario, partner, round]); // eslint-disable-line react-hooks/exhaustive-deps

  const reply = (t: string) => {
    const v = t.trim();
    if (!v || loading || feedback) return;
    setText("");
    ask([...history, { from: "me", text: v }]);
  };
  const reset = () => {
    setScenario(null);
    setPartner(null);
    setHistory([]);
    setFeedback(null);
    setSuggestions([]);
  };

  // 1) 상황 고르기
  if (!sc)
    return (
      <>
        <section className="hero">
          <h1 className="title">스몰토크 생존기</h1>
          <p className="sub">회사에서 1:1로 마주치는 순간, 미리 연습해 봐요</p>
        </section>
        <ul className="scenarios">
          {SCENARIOS.map((s) => (
            <li key={s.id}>
              <button className="scenario" onClick={() => setScenario(s.id)}>
                <b>{s.title}</b>
                <span>{s.desc}</span>
              </button>
            </li>
          ))}
        </ul>
      </>
    );

  // 2) 상대 고르기
  if (!pt)
    return (
      <>
        <section className="hero">
          <h1 className="title">{sc.title}</h1>
          <p className="sub">{sc.desc}</p>
        </section>
        <p className="pick-label">누구랑 마주쳤나요?</p>
        <div className="chips">
          {PARTNERS.map((p) => (
            <button key={p.id} className="chip" onClick={() => start(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <button className="link" onClick={() => setScenario(null)}>
          다른 상황 고르기
        </button>
      </>
    );

  // 3) 리허설
  return (
    <div className="rehearsal">
      <div className="rehearsal-head">
        <b>
          {sc.title} · {pt.label}
        </b>
        <span>
          {feedback ? "리허설 끝" : `내 차례 ${Math.min(myTurns + 1, REHEARSAL_TURNS)} / ${REHEARSAL_TURNS}`}
        </span>
      </div>
      <p className="situation">{sc.desc}</p>

      <div className="talk-body">
        {history.map((m, i) => (
          <div key={i} className={m.from === "me" ? "bubble-row me" : "bubble-row"}>
            {m.from === "them" && <span className="avatar">{pt.label.slice(0, 1)}</span>}
            <p className={m.from === "me" ? "msg me" : "msg"}>{m.text}</p>
          </div>
        ))}
        {loading && (
          <div className="bubble-row">
            <span className="avatar">{pt.label.slice(0, 1)}</span>
            <p className="msg typing">…</p>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="empty">
          <p>상대가 잠깐 멈췄어요.</p>
          <button className="btn" onClick={() => ask(history)}>
            다시 시도
          </button>
        </div>
      )}

      {feedback ? (
        <div className="feedback">
          <p className="score">
            생존 점수 <b>{Math.max(1, Math.min(5, Math.round(feedback.score)))}</b> / 5
          </p>
          <p>
            <b>잘한 점</b> {feedback.good}
          </p>
          <p>
            <b>다음엔</b> {feedback.tip}
          </p>
          <div className="feedback-actions">
            <button className="btn" onClick={() => start(pt.id)}>
              한 번 더
            </button>
            <button className="btn primary" onClick={reset}>
              다른 상황
            </button>
          </div>
        </div>
      ) : (
        !loading &&
        !error && (
          <>
            {suggestions.length > 0 && (
              <div className="suggestions">
                {suggestions.map((s) => (
                  <button key={s} className="suggestion" onClick={() => reply(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <form
              className="talk-input"
              onSubmit={(e) => {
                e.preventDefault();
                reply(text);
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="직접 말해 보기"
                maxLength={300}
                aria-label="내 대답"
              />
              <button className="btn primary" disabled={!text.trim()}>
                말하기
              </button>
            </form>
          </>
        )
      )}

      {!feedback && (
        <button className="link" onClick={reset}>
          그만하고 나가기
        </button>
      )}
    </div>
  );
}
