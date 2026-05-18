import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type PublicSupabaseConfig = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let supabaseClient: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const isSupabaseConfigured = Boolean(supabaseClient);
export const supabase = supabaseClient;

export async function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const response = await fetch("/api/public-config", { cache: "no-store" });
  if (!response.ok) return null;

  const config = (await response.json()) as PublicSupabaseConfig;
  if (!config.supabaseUrl || !config.supabaseAnonKey) return null;

  supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
  return supabaseClient;
}
