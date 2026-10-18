"use client";
import { useState } from "react";
import Onboarding from "./Onboarding";
import Home from "./Home";
import type { Profile } from "@/lib/topics";

// 키워드별 탭: 관심 키워드를 고르면 그 관심사 뉴스 키워드 목록.
export default function KeywordNews({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => void }) {
  const [editingKeywords, setEditingKeywords] = useState(false);

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
