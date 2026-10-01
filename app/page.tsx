"use client";
import { useEffect, useState } from "react";
import Onboarding from "@/components/Onboarding";
import AppShell from "@/components/AppShell";
import { clearProfile, loadProfile, saveProfile } from "@/lib/storage";
import type { Profile } from "@/lib/topics";

// 처음엔 "사전 정보 조사": 안내 → 이름 → 연령대 → 내향 정도 → 팀 분위기 → 결과. 끝나면 메인(실검 탭).
// 같이 먹는 사람과 관심 키워드는 키워드별 탭에서 고른다 (같이 먹는 사람은 하루 한 번).
// 상단 "성향 재설정"은 저장한 선택을 전부 지우고 사전 조사부터.
export default function Page() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fresh, setFresh] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = loadProfile();
    setProfile(saved?.profile ?? null);
    setFresh(saved?.fresh ?? false);
    setReady(true);
  }, []);

  const save = (p: Profile) => {
    saveProfile(p);
    setProfile(p);
    setFresh(p.targetAges.length > 0);
  };

  if (!ready) return null;
  if (!profile || profile.introversion === undefined || !profile.teamMood)
    return <Onboarding initial={profile} steps={[5, 7, 0, 3, 4, 6]} onDone={save} />;
  return (
    <AppShell
      profile={profile}
      fresh={fresh}
      onSave={save}
      onReset={() => {
        clearProfile();
        setProfile(null);
        setFresh(false);
      }}
    />
  );
}
