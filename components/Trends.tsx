"use client";
import { useEffect, useState } from "react";

type Trend = { keyword: string; why?: string; talk?: string; news: { title: string; url: string; source: string }[] };

// 실검 탭: 지금 많이 검색되는 키워드 TOP 10.
// 키워드를 누르면 왜 떴는지, 점심에 꺼낼 한마디, 관련 기사가 펼쳐진다.
export default function Trends() {
  const [trends, setTrends] = useState<Trend[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    setError(false);
    setTrends(null);
    setOpen(null);
    fetch("/api/trends")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setTrends(d.trends))
      .catch(() => setError(true));
  }, [attempt]);

  return (
    <>
      <section className="hero">
        <h1 className="title">실시간 검색어</h1>
        <p className="sub">누르면 왜 떴는지랑 써먹을 한마디가 나와요</p>
      </section>

      {error && (
        <div className="empty">
          <p>검색어를 못 가져왔어요.</p>
          <button className="btn" onClick={() => setAttempt((n) => n + 1)}>
            다시 시도
          </button>
        </div>
      )}
      {!trends && !error && <p className="empty">검색어 모으는 중…</p>}

      {trends && (
        <ol className="trends">
          {trends.map((t, i) => {
            const expanded = open === t.keyword;
            return (
              <li key={t.keyword} className="trend">
                <button className="trend-row" onClick={() => setOpen(expanded ? null : t.keyword)} aria-expanded={expanded}>
                  <span className="rank">{i + 1}</span>
                  <span className="trend-body">
                    <b>{t.keyword}</b>
                    {t.why && <span className={expanded ? "trend-why full" : "trend-why"}>{t.why}</span>}
                  </span>
                </button>
                {expanded && (
                  <div className="trend-more">
                    {t.talk && <p className="trend-talk">“{t.talk}”</p>}
                    {t.news.length > 0 && (
                      <ul className="links">
                        {t.news.map((n) => (
                          <li key={n.url}>
                            <a href={n.url} target="_blank" rel="noopener noreferrer">
                              {n.title}
                            </a>
                            {n.source && <span> · {n.source}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <p className="note">구글 트렌드 기준 · 10분마다 바뀌어요</p>
    </>
  );
}
