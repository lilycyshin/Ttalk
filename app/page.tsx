"use client";
import { useEffect, useState } from "react";
import Onboarding from "@/components/Onboarding";
import Home from "@/components/Home";
import { loadProfile, saveProfile } from "@/lib/storage";
import type { Profile } from "@/lib/topics";

// 처음: 연령대 → 같이 먹는 사람 → 관심사. 다음 날부터는 연령대를 건너뛰고 나머지 둘만 다시 묻는다.
// 홈의 "다시하기"는 같이 먹는 사람부터 다시 고른다. 연령대는 거기서 "이전으로"를 누르면 바꿀 수 있다.
export default function Page() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fresh, setFresh] = useState(false);
  const [editing, setEditing] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = loadProfile();
    setProfile(saved?.profile ?? null);
    setFresh(saved?.fresh ?? false);
    setReady(true);
  }, []);

  if (!ready) return null;
  if (!profile || !fresh || editing)
    return (
      <Onboarding
        initial={profile}
        startStep={profile ? 1 : 0}
        onDone={(p) => {
          saveProfile(p);
          setProfile(p);
          setFresh(true);
          setEditing(false);
        }}
      />
    );
  return <Home profile={profile} onEdit={() => setEditing(true)} />;
}
