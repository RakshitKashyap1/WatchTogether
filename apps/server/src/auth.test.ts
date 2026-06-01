import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./db.js", () => ({
  query: vi.fn()
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(() => "mock-jwt-token"),
    verify: vi.fn(() => ({
      id: "user-1",
      email: "host@example.com",
      displayName: "Movie Host",
      provider: "local"
    }))
  }
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(() => Promise.resolve("$2a$12$hashed")),
    compare: vi.fn(() => Promise.resolve(true))
  }
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: {
            user: {
              id: "supabase-user-1",
              email: "test@example.com",
              user_metadata: { display_name: "Supabase User" }
            }
          },
          error: null
        })
      )
    }
  }))
}));

import { query } from "./db.js";
import { register, login, requireAuth, verifySocketToken, me, syncAuthUser } from "./auth.js";

function mockReq(overrides = {}) {
  return {
    header: vi.fn(() => "Bearer some-token"),
    body: {},
    user: undefined,
    ...overrides
  } as any;
}

function mockRes() {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res as any;
}

function mockNext() {
  return vi.fn();
}

describe("register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers a new user and returns token", async () => {
    vi.mocked(query).mockResolvedValueOnce([
      { id: "user-1", email: "host@example.com", display_name: "Movie Host" }
    ]);

    const req = mockReq({
      body: { email: "host@example.com", password: "password123", displayName: "Movie Host" }
    });
    const res = mockRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "mock-jwt-token",
        user: expect.objectContaining({
          email: "host@example.com",
          displayName: "Movie Host"
        })
      })
    );
  });

  it("rejects short passwords", async () => {
    const req = mockReq({
      body: { email: "host@example.com", password: "short", displayName: "Host" }
    });
    const res = mockRes();

    await expect(register(req, res)).rejects.toThrow();
  });

  it("rejects invalid email", async () => {
    const req = mockReq({
      body: { email: "not-an-email", password: "password123", displayName: "Host" }
    });
    const res = mockRes();

    await expect(register(req, res)).rejects.toThrow();
  });

  it("uses email prefix as display name when not provided", async () => {
    vi.mocked(query).mockResolvedValueOnce([
      { id: "user-1", email: "user@gmail.com", display_name: "user" }
    ]);

    const req = mockReq({
      body: { email: "user@gmail.com", password: "password123" }
    });
    const res = mockRes();

    await register(req, res);

    expect(query).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(["user@gmail.com", "user", expect.any(String)])
    );
  });
});

describe("login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs in with valid credentials", async () => {
    vi.mocked(query).mockResolvedValueOnce([
      {
        id: "user-1",
        email: "host@example.com",
        display_name: "Movie Host",
        password_hash: "$2a$12$hashed"
      }
    ]);

    const req = mockReq({
      body: { email: "host@example.com", password: "password123" }
    });
    const res = mockRes();

    await login(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "mock-jwt-token",
        user: expect.objectContaining({ email: "host@example.com" })
      })
    );
  });

  it("rejects invalid credentials", async () => {
    vi.mocked(query).mockResolvedValueOnce([]);

    const req = mockReq({
      body: { email: "wrong@example.com", password: "wrongpass" }
    });
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Invalid email or password" })
    );
  });
});

describe("requireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(query).mockResolvedValue([]);
  });

  it("passes with valid token", async () => {
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    await requireAuth(req, res, next);

    expect(req.user).toBeDefined();
    expect(req.user!.email).toBe("host@example.com");
    expect(next).toHaveBeenCalled();
  });

  it("returns 401 when no authorization header", async () => {
    const req = mockReq({ header: vi.fn(() => null) });
    const res = mockRes();
    const next = mockNext();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 with malformed header", async () => {
    const req = mockReq({ header: vi.fn(() => "NotBearer token") });
    const res = mockRes();
    const next = mockNext();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("verifySocketToken", () => {
  it("returns AuthUser for a valid token", async () => {
    const user = await verifySocketToken("valid-jwt");
    expect(user).toBeDefined();
    expect(user.id).toBe("user-1");
    expect(user.email).toBe("host@example.com");
    expect(user.displayName).toBe("Movie Host");
  });
});

describe("me", () => {
  it("returns the current user", () => {
    const req = mockReq({ user: { id: "u1", email: "a@b.com", displayName: "A", provider: "local" } });
    const res = mockRes();

    me(req, res);

    expect(res.json).toHaveBeenCalledWith({
      user: { id: "u1", email: "a@b.com", displayName: "A", provider: "local" }
    });
  });
});

describe("syncAuthUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(query).mockResolvedValue([]);
  });

  it("upserts user profile and returns user", async () => {
    const req = mockReq({ user: { id: "u1", email: "a@b.com", displayName: "A", provider: "local" } });
    const res = mockRes();

    await syncAuthUser(req, res);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("insert into users"),
      ["u1", "a@b.com", "A"]
    );
    expect(res.json).toHaveBeenCalledWith({
      user: { id: "u1", email: "a@b.com", displayName: "A", provider: "local" }
    });
  });
});
