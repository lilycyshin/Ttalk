"use client";
import { useEffect, useState } from "react";
import Onboarding from "@/components/Onboarding";
import Home from "@/components/Home";
import { loadProfile, saveProfile } from "@/lib/storage";
import type { Profile } from "@/lib/topics";

export default function Page() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
    setReady(true);
  }, []);

  if (!ready) return null;
  if (!profile || editing)
    return (
      <Onboarding
        initial={profile}
        onDone={(p) => {
          saveProfile(p);
          setProfile(p);
          setEditing(false);
        }}
      />
    );
  return <Home profile={profile} onEdit={() => setEditing(true)} />;
}
