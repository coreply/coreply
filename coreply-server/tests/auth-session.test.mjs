import assert from "node:assert/strict";
import test from "node:test";
import { createAuthClient } from "better-auth/client";

const session = {
  session: { id: "test-session", userId: "test-user", expiresAt: "2099-01-01T00:00:00.000Z" },
  user: { id: "test-user", name: "Test User", email: "test@example.com" },
};

test("transient errors preserve the session; recovery refreshes it; 401 clears it", async () => {
  let response = () => Response.json(session);
  const client = createAuthClient({
    baseURL: "https://cloud.example.com",
    fetchOptions: { customFetchImpl: async () => response() },
  });
  const atom = client.$store.atoms.session;
  await atom.get().refetch();
  assert.equal(atom.get().data.user.id, "test-user");

  response = () => { throw new TypeError("Network unavailable"); };
  await atom.get().refetch();
  assert.equal(atom.get().data.user.id, "test-user");
  assert.ok(atom.get().error);

  response = () => Response.json({ message: "Unavailable" }, { status: 503 });
  await atom.get().refetch();
  assert.equal(atom.get().data.user.id, "test-user");

  response = () => Response.json(session);
  await atom.get().refetch();
  assert.equal(atom.get().error, null);

  response = () => Response.json({ message: "Unauthorized" }, { status: 401 });
  await atom.get().refetch();
  assert.equal(atom.get().data, null);
});

test("a successful empty session clears cached authentication", async () => {
  let data = session;
  const client = createAuthClient({
    baseURL: "https://cloud.example.com",
    fetchOptions: { customFetchImpl: async () => Response.json(data) },
  });
  const atom = client.$store.atoms.session;
  await atom.get().refetch();
  assert.ok(atom.get().data);
  data = null;
  await atom.get().refetch();
  assert.equal(atom.get().data, null);
  assert.equal(atom.get().error, null);
});
