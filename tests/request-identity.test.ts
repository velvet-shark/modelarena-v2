import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest, NextResponse } from "next/server";
import { VOTER_COOKIE, getVoterId, hashIp, isSameOrigin, setVoterCookie, voterKey } from "@/lib/voter";
import { getClientIp } from "@/lib/rate-limit";

const request = (headers: Record<string, string> = {}) => new NextRequest("http://localhost/api/x", { headers });

test("voter cookie: issued id round-trips, tampered cookie is ignored", () => {
  const first = getVoterId(request());
  assert.equal(first.isNew, true);

  const res = NextResponse.json({});
  setVoterCookie(res, first.voterId);
  const cookie = res.cookies.get(VOTER_COOKIE)?.value;
  assert.ok(cookie?.startsWith(`${first.voterId}.`));

  const again = getVoterId(request({ cookie: `${VOTER_COOKIE}=${cookie}` }));
  assert.deepEqual(again, { voterId: first.voterId, isNew: false });

  const forged = getVoterId(request({ cookie: `${VOTER_COOKIE}=someone-else.${cookie!.split(".")[1]}` }));
  assert.equal(forged.isNew, true);
  assert.equal(getVoterId(request({ cookie: `${VOTER_COOKIE}=no-signature` })).isNew, true);
});

test("stored voter key and IP hash are stable and don't contain the input", () => {
  assert.equal(voterKey("abc"), voterKey("abc"));
  assert.notEqual(voterKey("abc"), voterKey("abd"));
  assert.match(hashIp("203.0.113.7"), /^[0-9a-f]{32}$/);
  assert.notEqual(hashIp("203.0.113.7"), voterKey("203.0.113.7"));
});

test("same-origin check", () => {
  assert.equal(isSameOrigin(request({ host: "modelarena.ai" })), true);
  assert.equal(isSameOrigin(request({ host: "modelarena.ai", origin: "https://modelarena.ai" })), true);
  assert.equal(isSameOrigin(request({ host: "modelarena.ai", origin: "https://evil.example" })), false);
  assert.equal(isSameOrigin(request({ host: "app:3000", "x-forwarded-host": "modelarena.ai", origin: "https://modelarena.ai" })), true);
  assert.equal(isSameOrigin(request({ host: "modelarena.ai", origin: "null" })), false);
});

test("client IP: rightmost X-Forwarded-For, configured header wins", () => {
  const saved = process.env.CLIENT_IP_HEADER;
  try {
    delete process.env.CLIENT_IP_HEADER;
    assert.equal(getClientIp(request({ "x-forwarded-for": "1.1.1.1, 10.0.0.2" })), "10.0.0.2");
    assert.equal(getClientIp(request({ "x-real-ip": "10.0.0.3" })), "10.0.0.3");
    assert.equal(getClientIp(request()), "unknown");

    process.env.CLIENT_IP_HEADER = "cf-connecting-ip";
    assert.equal(
      getClientIp(request({ "cf-connecting-ip": "198.51.100.4", "x-forwarded-for": "1.1.1.1, 10.0.0.2" })),
      "198.51.100.4"
    );
    // Header missing (e.g. request bypassed the CDN): fall back to the proxy's entry
    assert.equal(getClientIp(request({ "x-forwarded-for": "10.0.0.2" })), "10.0.0.2");
  } finally {
    if (saved === undefined) delete process.env.CLIENT_IP_HEADER;
    else process.env.CLIENT_IP_HEADER = saved;
  }
});
