import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.hoisted(() => vi.fn());

vi.mock("pg", () => ({
  default: {
    Pool: vi.fn(() => ({
      query: mockQuery
    }))
  }
}));

vi.mock("./config.js", () => ({
  config: {
    databaseUrl: "postgresql://test:test@localhost:5432/test"
  }
}));

import { query } from "./db.js";

describe("db query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns rows from a successful query", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: "test" }] });

    const rows = await query("select $1 as id, $2 as name", [1, "test"]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ id: 1, name: "test" });
  });

  it("calls pool.query with the given SQL and params", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await query("select * from users where email = $1", ["a@b.com"]);

    expect(mockQuery).toHaveBeenCalledWith("select * from users where email = $1", ["a@b.com"]);
  });

  it("re-throws errors from the pool", async () => {
    mockQuery.mockRejectedValueOnce(new Error("Connection refused"));

    await expect(query("select 1")).rejects.toThrow("Connection refused");
  });
});
