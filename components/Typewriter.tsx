"use client";
import { useEffect, useState } from "react";

// 글자가 한 자씩 타이핑되듯 나타난다. text가 바뀌면 처음부터 다시. 움직임 줄이기 설정이면 바로 전체를 보여준다.
export default function Typewriter({ text, speed = 55 }: { text: string; speed?: number }) {
  const [shown, setShown] = useState(0);
  const chars = Array.from(text);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setShown(chars.length);
      return;
    }
    setShown(0);
    const id = setInterval(() => {
      setShown((n) => {
        if (n >= chars.length) clearInterval(id);
        return Math.min(n + 1, chars.length);
      });
    }, speed);
    return () => clearInterval(id);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span aria-label={text}>
      <span aria-hidden>{chars.slice(0, shown).join("")}</span>
      <span className={shown < chars.length ? "caret" : "caret done"} aria-hidden />
    </span>
  );
}
