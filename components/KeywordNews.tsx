"use client";
import { useState } from "react";
import Onboarding from "./Onboarding";
import Home from "./Home";
import type { Profile } from "@/lib/topics";

// 키워드별 탭: 오늘 같이 먹는 사람(하루 한 번)과 관심 키워드를 고르면 맞춤 뉴스.
// fresh: 오늘 같이 먹는 사람을 이미 골랐는지.
export default function KeywordNews({
  profile,
  fresh,
  onSave,
}: {
  profile: Profile;
  fresh: boolean;
  onSave: (p: Profile) => void;
}) {
  const [editingKeywords, setEditingKeywords] = useState(false);

  if (!fresh || profile.targetAges.length === 0)
    return (
      <Onboarding
        embedded
        initial={profile}
        steps={profile.interests.length ? [1] : [1, 2]}
        onDone={onSave}
      />
    );
  if (editingKeywords || profile.interests.length === 0)
    return (
      <Onboarding
        embedded
        initial={profile}
        steps={[2]}
        onDone={(p) => {
          setEditingKeywords(false);
          onSave(p);
        }}
      />
    );
  return <Home profile={profile} onEditKeywords={() => setEditingKeywords(true)} />;
}
