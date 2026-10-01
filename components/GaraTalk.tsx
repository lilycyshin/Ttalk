"use client";
import { useEffect, useRef, useState } from "react";

type Msg = { from: "me" | "friend"; text: string };

// 남이 봐도 대화 중간처럼 보이게 시작한다.
const FIRST: Msg = { from: "friend", text: "그니까 ㅋㅋㅋ대박임" };

// 가라톡: 점심 자리에서 카톡하는 척할 수 있는 전체 화면 메신저. 상대 "정대호"는 Gemini가 친구처럼 답한다.
// 뒤로가기 버튼으로만 나간다. 대화는 저장하지 않아서 나갔다 들어오면 처음부터.
export default function GaraTalk({ onBack }: { onBack: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([FIRST]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // 예전 버전이 저장해 둔 대화는 지운다.
  useEffect(() => {
    try {
      localStorage.removeItem("smalltalk.garatalk.v1");
      localStorage.removeItem("smalltalk.garatalk.v2");
    } catch {}
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [msgs, typing]);
  // 전체 화면인 동안 뒤 페이지가 스크롤되지 않게
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  // 키보드가 올라와도 상단 바는 그대로: 화면을 "키보드에 안 가린 영역"(visualViewport)에 맞춰
  // 높이를 줄이고 위치를 맞춘다. 줄어드는 건 대화 목록뿐이다. (iOS 사파리는 화면을 밀어 올리기 때문에 필요)
  useEffect(() => {
    const vv = window.visualViewport;
    const box = boxRef.current;
    if (!vv || !box) return;
    const fit = () => {
      box.style.height = `${vv.height}px`;
      box.style.transform = `translateY(${vv.offsetTop}px)`;
      endRef.current?.scrollIntoView({ block: "end" });
    };
    fit();
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    window.addEventListener("resize", fit);
    return () => {
      vv.removeEventListener("resize", fit);
      vv.removeEventListener("scroll", fit);
      window.removeEventListener("resize", fit);
    };
  }, []);

  const send = async () => {
    const t = text.trim();
    if (!t || typing) return;
    const next = [...msgs, { from: "me" as const, text: t }];
    setMsgs(next);
    setText("");
    setTyping(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const d = await r.json();
      setMsgs((m) => [...m, { from: "friend", text: d.reply ?? "앗 잠깐 렉 걸림 ㅋㅋ" }]);
    } catch {
      setMsgs((m) => [...m, { from: "friend", text: "앗 잠깐 렉 걸림 ㅋㅋ 다시 보내줘" }]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="talk-full" role="dialog" aria-label="가라톡" ref={boxRef}>
      <header className="talk-bar">
        <button className="talk-back" onClick={onBack} aria-label="뒤로가기">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <b>정대호</b>
        <button className="talk-clear" onClick={() => setMsgs([FIRST])}>
          지우기
        </button>
      </header>

      <div className="talk-scroll">
        {msgs.map((m, i) => (
          <div key={i} className={m.from === "me" ? "bubble-row me" : "bubble-row"}>
            {m.from === "friend" && <span className="avatar">정</span>}
            <p className={m.from === "me" ? "msg me" : "msg"}>{m.text}</p>
          </div>
        ))}
        {typing && (
          <div className="bubble-row">
            <span className="avatar">정</span>
            <p className="msg typing">…</p>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="talk-compose"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} aria-label="메시지" />
        <button className="talk-send" disabled={!text.trim() || typing}>
          전송
        </button>
      </form>
    </div>
  );
}
