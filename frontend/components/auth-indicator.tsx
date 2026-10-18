"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, User as UserIcon, RefreshCw } from "lucide-react";
import { getAuthToken, getCurrentUser } from "@/lib/api";
import type { UserProfile } from "@/lib/types";

export function AuthIndicator() {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    void getCurrentUser()
      .then(setUser)
      .catch(() => {
        const token = getAuthToken();
        setUser({ id: token, email: null, is_anonymous: token.startsWith("guest_") || token === "anonymous" });
      });
  }, []);

  const resetGuestSession = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("audio_notes_guest_id");
      localStorage.removeItem("audio_notes_auth_token");
      window.location.reload();
    }
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-2 text-xs py-1 px-2.5 rounded-full border border-slate-200 bg-white/70 backdrop-blur-sm shadow-xs text-slate-600">
      <span className="flex h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
      <span className="font-medium text-slate-700">
        {user.is_anonymous ? "Isolated Guest Session" : user.email || "Authenticated"}
      </span>
      <button
        onClick={resetGuestSession}
        title="Reset workspace session"
        className="ml-1 text-slate-400 hover:text-slate-700 transition cursor-pointer p-0.5 rounded"
        aria-label="Reset workspace session"
      >
        <RefreshCw size={11} />
      </button>
    </div>
  );
}
