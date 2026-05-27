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
  provider: "local";
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
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUser;
    req.user = decoded;
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

export async function verifySocketToken(token: string): Promise<AuthUser> {
  return jwt.verify(token, config.jwtSecret) as AuthUser;
}
