"use client";
import { useEffect, useState } from "react";
import Onboarding from "@/components/Onboarding";
import Home from "@/components/Home";
import { clearProfile, loadProfile, saveProfile } from "@/lib/storage";
import type { Profile } from "@/lib/topics";

// 처음: 연령대 → 같이 먹는 사람 → 관심사. 다음 날부터는 연령대를 건너뛰고 나머지 둘만 다시 묻는다.
// 홈의 "다시하기"는 저장한 선택을 전부 지우고 연령대부터 새로 고른다.
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

  if (!ready) return null;
  if (!profile || !fresh)
    return (
      <Onboarding
        initial={profile}
        startStep={profile ? 1 : 0}
        onDone={(p) => {
          saveProfile(p);
          setProfile(p);
          setFresh(true);
        }}
      />
    );
  return (
    <Home
      profile={profile}
      onEdit={() => {
        clearProfile();
        setProfile(null);
        setFresh(false);
      }}
    />
  );
}
