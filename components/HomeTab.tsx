"use client";
import Mascot from "./Mascot";
import { TEAM_MOOD_LABEL, introvertLevel } from "@/lib/persona";
import { AGE_LABEL, type Profile } from "@/lib/topics";

// 홈 탭: 내 성향 요약.
export default function HomeTab({ profile }: { profile: Profile }) {
  const level = introvertLevel(profile.introversion ?? 0);

  return (
    <>
      <section className="hero">
        <Mascot say="오늘도 같이 살아남아 봐요" src={level.image} />
        <h1 className="title">{profile.nickname || level.name}님, 안녕하세요</h1>
        <p className="sub">{level.desc}</p>
      </section>

      <div className="result-card">
        <p>
          <b>연령대</b> {AGE_LABEL[profile.myAge]}
        </p>
        <p>
          <b>내향 정도</b> {level.name}
        </p>
        <p>
          <b>팀 분위기</b> {profile.teamMood ? TEAM_MOOD_LABEL[profile.teamMood] : "-"}
        </p>
      </div>
    </>
  );
}
