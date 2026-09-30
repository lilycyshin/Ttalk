"use client";
import { useEffect, useState } from "react";
import Onboarding from "@/components/Onboarding";
import Home from "@/components/Home";
import { clearProfile, loadProfile, saveProfile } from "@/lib/storage";
import type { Profile } from "@/lib/topics";

// 처음: 연령대 → 같이 먹는 사람 → 관심사.
// 다음 날부터는 "오늘 어떤 분이랑 식사하세요?"만 묻고, 관심사는 저장한 걸 그대로 쓴다.
// 홈의 "키워드 다시 선택"은 관심사만, "다시하기"는 저장한 선택을 전부 지우고 처음부터.
export default function Page() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fresh, setFresh] = useState(false);
  const [editingKeywords, setEditingKeywords] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = loadProfile();
    setProfile(saved?.profile ?? null);
    setFresh(saved?.fresh ?? false);
    setReady(true);
  }, []);

  const done = (p: Profile) => {
    saveProfile(p);
    setProfile(p);
    setFresh(true);
    setEditingKeywords(false);
  };

  if (!ready) return null;
  if (!profile) return <Onboarding steps={[0, 1, 2]} onDone={done} />;
  // 관심사가 저장돼 있지 않은 예전 프로필이면 관심사도 같이 묻는다.
  if (!fresh) return <Onboarding initial={profile} steps={profile.interests.length ? [1] : [1, 2]} onDone={done} />;
  if (editingKeywords) return <Onboarding initial={profile} steps={[2]} onDone={done} />;
  return (
    <Home
      profile={profile}
      onEditKeywords={() => setEditingKeywords(true)}
      onReset={() => {
        clearProfile();
        setProfile(null);
        setFresh(false);
      }}
    />
  );
}
