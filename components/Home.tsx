"use client";
import { useEffect, useMemo, useState } from "react";
import { pickForUser, type Daily, type Profile } from "@/lib/topics";
import Mascot from "./Mascot";
import { sceneImage } from "@/lib/persona";

// 뉴스 탭
export default function Home({ profile, onEditKeywords }: { profile: Profile; onEditKeywords: () => void }) {
  const [daily, setDaily] = useState<Daily | null>(null);
  const [error, setError] = useState(false);
  // "상세 보기"로 펼친 카드들
  const [open, setOpen] = useState<Record<string, boolean>>({});

  // 내 관심사·상대 연령대에 맞는 뉴스를 실시간으로 받는다(/api/today). 실패하면 다시 시도 버튼.
  // 만드는 데 오래 걸려서, 같은 조건으로 30분 안에 다시 열면 이 탭에서 받아 둔 걸 바로 보여준다 (탭을 닫으면 사라짐).
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const query = `i=${profile.interests.join(",")}&a=${profile.targetAges.join(",")}`;
    const cacheKey = `smalltalk.today.${query}`;
    setError(false);
    if (attempt === 0) {
      try {
        const hit = JSON.parse(sessionStorage.getItem(cacheKey) ?? "null");
        if (hit && Date.now() - hit.at < 30 * 60_000) return setDaily(hit.daily);
      } catch {}
    }
    setDaily(null);
    fetch(`/api/today?${query}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Daily>) : Promise.reject()))
      .then((d) => {
        setDaily(d);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), daily: d }));
        } catch {}
      })
      .catch(() => setError(true));
  }, [profile.interests, profile.targetAges, attempt]);

  const date = daily?.date ?? new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const picks = useMemo(() => (daily ? pickForUser(daily, profile) : []), [daily, profile]);
  const toggle = (key: string) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  return (
    <>

      <section className="hero">
        <Mascot say={cheer(daily ? picks.length : null)} src={sceneImage(profile.introversion ?? 2, "news")} />
        <p className="date">{formatDate(date)}</p>
        <div className="keywords">
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
    </>
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
