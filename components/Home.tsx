"use client";
import { useEffect, useMemo, useState } from "react";
import { AGE_LABEL, INTERESTS, pickForUser, type Daily, type Profile } from "@/lib/topics";
import Mascot from "./Mascot";

export default function Home({
  profile,
  onEditKeywords,
  onReset,
}: {
  profile: Profile;
  onEditKeywords: () => void;
  onReset: () => void;
}) {
  const [daily, setDaily] = useState<Daily | null>(null);
  const [error, setError] = useState(false);
  // "상세 보기"로 펼친 카드들
  const [open, setOpen] = useState<Record<string, boolean>>({});

  // 앱을 열 때마다 내 관심사·상대 연령대에 맞는 뉴스를 실시간으로 받는다(/api/today). 실패하면 다시 시도 버튼.
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setError(false);
    setDaily(null);
    fetch(`/api/today?i=${profile.interests.join(",")}&a=${profile.targetAges.join(",")}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Daily>) : Promise.reject()))
      .then(setDaily)
      .catch(() => setError(true));
  }, [profile.interests, profile.targetAges, attempt]);

  const date = daily?.date ?? new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const picks = useMemo(() => (daily ? pickForUser(daily, profile) : []), [daily, profile]);
  const toggle = (key: string) => setOpen((o) => ({ ...o, [key]: !o[key] }));
  const keywordLabels = profile.interests.map((id) => INTERESTS.find((i) => i.id === id)?.label ?? id).join(", ");

  return (
    <main className="screen home">
      <header className="status">
        <span className="brand">내향인 생존하기</span>
        <button className="btn small" onClick={onReset}>다시하기</button>
      </header>

      <section className="hero">
        <Mascot say={cheer(daily ? picks.length : null)} />
        <p className="date">{formatDate(date)}</p>
        <h1 className="title">오늘 점심에 써먹을 얘기</h1>
        <p className="sub">{profile.targetAges.map((a) => AGE_LABEL[a]).join("·")}랑 식사</p>
        <div className="keywords">
          <span>키워드: {keywordLabels}</span>
          <button className="btn small" onClick={onEditKeywords}>
            키워드 다시 선택
          </button>
        </div>
      </section>

      {error && (
        <div className="empty">
          <p>뉴스를 못 가져왔어요.</p>
          <button className="btn" onClick={() => setAttempt((n) => n + 1)}>
            다시 시도
          </button>
        </div>
      )}
      {!daily && !error && <p className="empty">실시간 뉴스 가져오는 중…</p>}
      {daily && picks.length === 0 && (
        <div className="empty">
          <p>{profile.targetAges.length > 1 ? "오늘은 고른 관심사로 다 같이 얘기할 만한 뉴스가 없어요." : "오늘은 고른 관심사에 맞는 뉴스가 없어요."}</p>
          <button className="btn" onClick={onEditKeywords}>키워드 다시 선택</button>
        </div>
      )}

      <ol className="cards">
        {picks.map((p) => {
          const expanded = !!open[p.headline];
          return (
            <li key={p.headline} className="card">
              <div className="card-head">
                <span className="tag">{p.tag}</span>
                <span className="card-title">{p.headline}</span>
              </div>
              <p className="opener">“{p.opener}”</p>

              {expanded && (
                <div className="more">
                  <p className="summary">{p.summary}</p>
                  {p.background && <p className="background">{p.background}</p>}
                  {p.links.length > 0 && (
                    <ul className="links">
                      {p.links.map((l) => (
                        <li key={l.url}>
                          <a href={l.url} target="_blank" rel="noopener noreferrer">
                            {l.title}
                          </a>
                          {l.source && <span> · {l.source}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <button
                className={expanded ? "btn wide-sm primary" : "btn wide-sm"}
                onClick={() => toggle(p.headline)}
                aria-expanded={expanded}
              >
                {expanded ? "접기" : "상세 보기"}
              </button>
            </li>
          );
        })}
      </ol>
    </main>
  );
}

// 캐릭터 말풍선: 오늘 챙겨온 토픽 개수에 따라 바뀐다.
function cheer(count: number | null) {
  if (count === null) return "오늘 할 말 쥐어짜는 중…";
  if (count === 0) return "오늘은 딱 맞는 게 없네요";
  return `오늘 얘깃거리 ${count}개 챙겨왔어요`;
}

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00+09:00`);
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Seoul" });
}
