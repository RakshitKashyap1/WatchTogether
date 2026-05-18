"use client";

import { useEffect, useState } from "react";
import { api, saveSession } from "../../../lib/api";
import { getSupabaseClient } from "../../../lib/supabase";

export default function LoginCallbackPage() {
  const [message, setMessage] = useState("Finishing login...");

  useEffect(() => {
    async function finishLogin() {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        setMessage("Supabase Auth is not configured yet.");
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        setMessage(error?.message ?? "No login session found.");
        return;
      }

      const session = data.session;
      saveSession(session.access_token, {
        id: session.user.id,
        email: session.user.email ?? "",
        displayName:
          (session.user.user_metadata.display_name as string | undefined) ??
          (session.user.user_metadata.full_name as string | undefined) ??
          (session.user.user_metadata.name as string | undefined) ??
          session.user.email?.split("@")[0] ??
          "Guest"
      });
      await api("/api/auth/sync", { method: "POST" });
      window.location.href = "/";
    }

    void finishLogin();
  }, []);

  return <main className="shell">{message}</main>;
}
