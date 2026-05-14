import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "./config.js";
import { query } from "./db.js";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  provider?: "local" | "supabase";
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(80).optional()
});

function sign(user: AuthUser) {
  return jwt.sign(user, config.jwtSecret, { expiresIn: "7d" });
}

type SupabaseJwt = {
  sub: string;
  email?: string;
  user_metadata?: {
    display_name?: string;
    full_name?: string;
    name?: string;
  };
};

function displayNameFromEmail(email: string) {
  return email.split("@")[0] || "Guest";
}

function userFromSupabaseToken(token: string): AuthUser {
  if (!config.supabaseJwtSecret) throw new Error("SUPABASE_JWT_SECRET is not configured");

  const decoded = jwt.verify(token, config.supabaseJwtSecret) as SupabaseJwt;
  const email = decoded.email ?? `${decoded.sub}@supabase.local`;
  return {
    id: decoded.sub,
    email,
    displayName:
      decoded.user_metadata?.display_name ??
      decoded.user_metadata?.full_name ??
      decoded.user_metadata?.name ??
      displayNameFromEmail(email),
    provider: "supabase"
  };
}

function userFromLocalToken(token: string): AuthUser {
  return { ...(jwt.verify(token, config.jwtSecret) as AuthUser), provider: "local" };
}

function verifyAnyToken(token: string): AuthUser {
  if (config.supabaseJwtSecret) {
    try {
      return userFromSupabaseToken(token);
    } catch {
      // Keep older local development tokens usable while migrating to Supabase Auth.
    }
  }

  return userFromLocalToken(token);
}

async function upsertUserProfile(user: AuthUser) {
  await query(
    `insert into users (id, email, display_name, password_hash)
     values ($1, $2, $3, null)
     on conflict (id) do update
       set email = excluded.email,
           display_name = excluded.display_name`,
    [user.id, user.email, user.displayName]
  );
}

export async function register(req: Request, res: Response) {
  const body = authSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(body.password, 12);
  const [user] = await query<AuthUser & { display_name: string }>(
    `insert into users (email, display_name, password_hash)
     values ($1, $2, $3)
     returning id, email, display_name`,
    [body.email, body.displayName ?? body.email.split("@")[0], passwordHash]
  );

  const payload = { id: user.id, email: user.email, displayName: user.display_name, provider: "local" as const };
  res.status(201).json({ token: sign(payload), user: payload });
}

export async function login(req: Request, res: Response) {
  const body = authSchema.omit({ displayName: true }).parse(req.body);
  const [user] = await query<{ id: string; email: string; display_name: string; password_hash: string | null }>(
    "select id, email, display_name, password_hash from users where email = $1",
    [body.email]
  );

  if (!user?.password_hash || !(await bcrypt.compare(body.password, user.password_hash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const payload = { id: user.id, email: user.email, displayName: user.display_name, provider: "local" as const };
  res.json({ token: sign(payload), user: payload });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    req.user = verifyAnyToken(token);
    await upsertUserProfile(req.user);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function me(req: Request, res: Response) {
  res.json({ user: req.user });
}

export async function syncAuthUser(req: Request, res: Response) {
  await upsertUserProfile(req.user!);
  res.json({ user: req.user });
}

export function verifySocketToken(token: string): AuthUser {
  return verifyAnyToken(token);
}
