"use client";
import { useEffect, useMemo, useState } from "react";
import { AGE_LABEL, pickForUser, type Daily, type Profile } from "@/lib/topics";
import Mascot from "./Mascot";

type Panel = "next" | "info";

export default function Home({ profile, onEdit }: { profile: Profile; onEdit: () => void }) {
  const [daily, setDaily] = useState<Daily | null>(null);
  const [error, setError] = useState(false);
  // 카드별로 펼친 패널: "다음 멘트" / "추가 정보"
  const [open, setOpen] = useState<Record<string, Panel | undefined>>({});

  // 앱을 열 때마다 내 관심사 뉴스를 실시간으로 받고(/api/today), 실패하면 저장된 샘플로 대신한다.
  useEffect(() => {
    const get = (url: string) =>
      fetch(url, { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<Daily>) : Promise.reject()));
    get(`/api/today?i=${profile.interests.join(",")}`)
      .catch(() => get("/data/today.json"))
      .then(setDaily)
      .catch(() => setError(true));
  }, [profile.interests]);

  const date = daily?.date ?? new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const picks = useMemo(() => (daily ? pickForUser(daily, profile) : []), [daily, profile]);
  const toggle = (key: string, panel: Panel) => setOpen((o) => ({ ...o, [key]: o[key] === panel ? undefined : panel }));

  return (
    <main className="screen home">
      <header className="status">
        <span className="brand">내향인 생존하기</span>
        <button className="btn small" onClick={onEdit}>다시하기</button>
      </header>

      <section className="hero">
        <Mascot say={cheer(daily ? picks.length : null)} />
        <p className="date">{formatDate(date)}</p>
        <h1 className="title">오늘 점심에 써먹을 얘기</h1>
        <p className="sub">{profile.targetAges.map((a) => AGE_LABEL[a]).join("·")}랑 식사</p>
      </section>

      {error && <p className="empty">토픽을 못 불러왔어요. 좀 이따 다시 열어주세요.</p>}
      {!daily && !error && <p className="empty">실시간 뉴스 가져오는 중…</p>}
      {daily && picks.length === 0 && (
        <div className="empty">
          <p>{profile.targetAges.length > 1 ? "오늘은 고른 관심사로 다 같이 얘기할 만한 뉴스가 없어요." : "오늘은 고른 관심사에 맞는 뉴스가 없어요."}</p>
          <button className="btn" onClick={onEdit}>관심사 더 고르기</button>
        </div>
      )}

      <ol className="cards">
        {picks.map((p) => {
          const panel = open[p.headline];
          return (
            <li key={p.headline} className="card">
              <div className="card-head">
                <span className="tag">{p.tag}</span>
                <span className="card-title">{p.headline}</span>
              </div>
              <p className="opener">“{p.opener}”</p>

              {panel && (
                <div className="more">
                  {panel === "next" ? (
                    <p>{p.follow_up}</p>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              )}

              <div className="actions">
                <button
                  className={panel === "next" ? "btn primary" : "btn"}
                  onClick={() => toggle(p.headline, "next")}
                  aria-expanded={panel === "next"}
                >
                  다음 멘트
                </button>
                <button
                  className={panel === "info" ? "btn primary" : "btn"}
                  onClick={() => toggle(p.headline, "info")}
                  aria-expanded={panel === "info"}
                >
                  추가 정보
                </button>
              </div>
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
