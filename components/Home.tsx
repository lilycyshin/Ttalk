"use client";
import { useEffect, useMemo, useState } from "react";
import { AGE_LABEL, pickForUser, type AgeGroup, type Daily, type Profile } from "@/lib/topics";
import Mascot from "./Mascot";
import { loadUsed, toggleUsed, totalUsed } from "@/lib/storage";

// 써먹은 멘트 누적 개수로 올라가는 칭호. 게임처럼 가볍게.
const LEVELS = [
  { at: 0, name: "쭈굴 내향인" },
  { at: 3, name: "리액션 장인" },
  { at: 10, name: "스몰토크 새싹" },
  { at: 25, name: "점심 분위기 메이커" },
  { at: 50, name: "사회생활 만렙" },
];

export default function Home({ profile, onEdit }: { profile: Profile; onEdit: () => void }) {
  const [daily, setDaily] = useState<Daily | null>(null);
  const [error, setError] = useState(false);
  const [used, setUsed] = useState<Record<string, string[]>>({});
  const [open, setOpen] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  // 여러 연령대와 먹으면 기본은 가장 윗사람 말투. 탭으로 바꿔 볼 수 있다.
  const [speakTo, setSpeakTo] = useState<AgeGroup>(profile.targetAges[profile.targetAges.length - 1]);

  useEffect(() => {
    setUsed(loadUsed());
    fetch("/data/today.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setDaily)
      .catch(() => setError(true));
  }, []);

  const date = daily?.date ?? new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const picks = useMemo(() => (daily ? pickForUser(daily, profile, speakTo) : []), [daily, profile, speakTo]);
  const todayUsed = used[date] ?? [];
  const total = totalUsed(used);
  const levelIndex = LEVELS.filter((l) => total >= l.at).length - 1;
  const level = LEVELS[levelIndex];
  const next = LEVELS[levelIndex + 1];
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
          <span className="lv-badge">Lv.{levelIndex + 1}</span>
          <div className="lv-text">
            <b>{level.name}</b>
            <div className="bar"><div className="fill" style={{ width: `${progress * 100}%` }} /></div>
            <small>{next ? `다음 칭호까지 ${next.at - total}번 남음` : "최고 칭호 찍음"}</small>
          </div>
        </div>
        <button className="btn small" onClick={onEdit}>설정</button>
      </header>

      <section className="hero">
        <Mascot say={cheer(picks.length, todayUsed.length)} />
        <p className="date">{formatDate(date)}</p>
        <h1 className="title">오늘 점심에 써먹을 얘기</h1>
        <p className="sub">
          {profile.targetAges.map((a) => AGE_LABEL[a]).join("·")}랑 식사 · 오늘 {todayUsed.length}개 써먹음
        </p>
      </section>

      {error && <p className="empty">토픽을 못 불러왔어요. 좀 이따 다시 열어주세요.</p>}
      {!daily && !error && <p className="empty">오늘 얘깃거리 고르는 중…</p>}

      {profile.targetAges.length > 1 && (
        <div className="tabs" role="tablist">
          {profile.targetAges.map((a) => (
            <button
              key={a}
              role="tab"
              aria-selected={speakTo === a}
              className={speakTo === a ? "tab on" : "tab"}
              onClick={() => setSpeakTo(a)}
            >
              {AGE_LABEL[a]}랑
            </button>
          ))}
        </div>
      )}

      <ol className="cards">
        {picks.map((p, i) => {
          const done = todayUsed.includes(p.headline);
          return (
            <li key={p.headline} className={done ? "card done" : "card"}>
              <div className="card-head">
                <span className="tag">{p.tag}</span>
                <span className="card-title">{p.headline}</span>
              </div>
              <p className="opener">“{p.opener}”</p>

              {open === i && (
                <div className="more">
                  <p><b>반응 오면</b> {p.follow_up}</p>
                  <p className="summary">{p.summary}</p>
                </div>
              )}

              <div className="actions">
                <button className="btn" onClick={() => copy(i, p.opener)}>
                  {copied === i ? "복사 완료" : "복사"}
                </button>
                <button className="btn" onClick={() => setOpen(open === i ? null : i)}>
                  {open === i ? "접기" : "다음 멘트"}
                </button>
                <button
                  className={done ? "btn primary" : "btn"}
                  onClick={() => setUsed(toggleUsed(date, p.headline))}
                  aria-pressed={done}
                >
                  {done ? "써먹음" : "써먹었어요"}
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
  if (total === 0) return "오늘 얘깃거리 챙기는 중…";
  if (usedToday === 0) return `오늘은 딱 ${Math.min(total, 3)}개만 써먹어봐요`;
  if (usedToday < total) return `벌써 ${usedToday}개? 오늘 좀 치는데요`;
  return "오늘 할당량 끝. 이제 퇴근만 하면 돼요";
}

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00+09:00`);
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Seoul" });
}
