"use client";
import { useEffect, useMemo, useState } from "react";
import { AGE_LABEL, pickForUser, type Daily, type Profile } from "@/lib/topics";
import Mascot from "./Mascot";
import { loadUsed, toggleUsed, totalUsed } from "@/lib/storage";

// 써먹은 멘트 누적 개수로 올라가는 칭호. 게임처럼 가볍게.
const LEVELS = [
  { at: 0, name: "쭈굴 내향인", emoji: "🐣" },
  { at: 3, name: "끄덕 리액터", emoji: "🐥" },
  { at: 10, name: "스몰토크 새싹", emoji: "🌱" },
  { at: 25, name: "점심 분위기 메이커", emoji: "🌟" },
  { at: 50, name: "사회생활 만렙", emoji: "👑" },
];

export default function Home({ profile, onEdit }: { profile: Profile; onEdit: () => void }) {
  const [daily, setDaily] = useState<Daily | null>(null);
  const [error, setError] = useState(false);
  const [used, setUsed] = useState<Record<string, string[]>>({});
  const [open, setOpen] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    setUsed(loadUsed());
    fetch("/data/today.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setDaily)
      .catch(() => setError(true));
  }, []);

  const date = daily?.date ?? new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const picks = useMemo(() => (daily ? pickForUser(daily, profile) : []), [daily, profile]);
  const todayUsed = used[date] ?? [];
  const total = totalUsed(used);
  const level = [...LEVELS].reverse().find((l) => total >= l.at)!;
  const next = LEVELS.find((l) => l.at > total);
  const progress = next ? (total - level.at) / (next.at - level.at) : 1;

  const copy = async (i: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(i);
      setTimeout(() => setCopied(null), 1200);
    } catch {}
  };

  return (
    <main className="screen home">
      <header className="status">
        <div className="lv">
          <span className="lv-emoji" aria-hidden>{level.emoji}</span>
          <div className="lv-text">
            <b>{level.name}</b>
            <div className="bar"><div className="fill" style={{ width: `${progress * 100}%` }} /></div>
            <small>{next ? `다음 칭호까지 ${next.at - total}번` : "최고 칭호 달성"}</small>
          </div>
        </div>
        <button className="btn small" onClick={onEdit} aria-label="설정 바꾸기">⚙️</button>
      </header>

      <section className="hero">
        <Mascot say={cheer(picks.length, todayUsed.length)} />
        <p className="date">{formatDate(date)}</p>
        <h1 className="title">오늘의 점심 스몰토크</h1>
        <p className="sub">
          {AGE_LABEL[profile.targetAge]} 상대 · 오늘 {todayUsed.length}개 써먹음
        </p>
      </section>

      {error && <p className="empty">오늘 토픽을 못 불러왔어요. 잠시 후 다시 열어주세요.</p>}
      {!daily && !error && <p className="empty">토픽 고르는 중…</p>}

      <ol className="cards">
        {picks.map((p, i) => {
          const done = todayUsed.includes(p.headline);
          return (
            <li key={p.headline} className={done ? "card done" : "card"}>
              <div className="card-head">
                <span className="card-emoji" aria-hidden>{p.emoji}</span>
                <span className="card-title">{p.headline}</span>
              </div>
              <p className="opener">“{p.opener}”</p>

              {open === i && (
                <div className="more">
                  <p><b>이어서 한마디</b> {p.follow_up}</p>
                  <p className="summary">{p.summary}</p>
                </div>
              )}

              <div className="actions">
                <button className="btn" onClick={() => copy(i, p.opener)}>
                  {copied === i ? "복사됨 ✓" : "복사"}
                </button>
                <button className="btn" onClick={() => setOpen(open === i ? null : i)}>
                  {open === i ? "접기" : "다음 한마디"}
                </button>
                <button
                  className={done ? "btn primary" : "btn"}
                  onClick={() => setUsed(toggleUsed(date, p.headline))}
                  aria-pressed={done}
                >
                  {done ? "써먹음 ✓" : "써먹었어요"}
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </main>
  );
}

// 캐릭터 말풍선: 오늘 몇 개 써먹었는지에 따라 바뀐다.
function cheer(total: number, usedToday: number) {
  if (total === 0) return "오늘 얘깃거리 챙기는 중이에요…";
  if (usedToday === 0) return `오늘은 ${Math.min(total, 3)}개만 챙겨가요!`;
  if (usedToday < total) return `벌써 ${usedToday}개! 오늘 좀 하시는데요?`;
  return "오늘 다 써먹었어요. 퇴근해도 될 듯";
}

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00+09:00`);
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Seoul" });
}
