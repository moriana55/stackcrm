import { test } from "node:test";
import assert from "node:assert/strict";
import { roleAtLeast, hasPermission, normalizeRole } from "../lib/rbac.ts";

test("roleAtLeast: owner, admin eşiğini geçer (happy path)", () => {
  assert.equal(roleAtLeast("owner", "admin"), true);
  assert.equal(roleAtLeast("admin", "admin"), true);
  assert.equal(roleAtLeast("owner", "viewer"), true);
});

test("roleAtLeast: yetki yükseltme reddi — düşük rol yüksek eşiği geçemez", () => {
  // viewer admin olamaz, stylist owner olamaz: privilege escalation engeli
  assert.equal(roleAtLeast("viewer", "admin"), false);
  assert.equal(roleAtLeast("stylist", "owner"), false);
  assert.equal(roleAtLeast("stylist", "admin"), false);
});

test("roleAtLeast: bilinmeyen/null rol en düşük (viewer) gibi davranır — fail-closed", () => {
  assert.equal(roleAtLeast(null, "viewer"), true);
  assert.equal(roleAtLeast(undefined, "stylist"), false);
  assert.equal(roleAtLeast("superhacker", "admin"), false);
});

test("hasPermission: admin billing.manage YETKİSİNE sahip değil (escalation denied)", () => {
  assert.equal(hasPermission("owner", "billing.manage"), true);
  assert.equal(hasPermission("admin", "billing.manage"), false);
  assert.equal(hasPermission("viewer", "customers.manage"), false);
});

test("normalizeRole: eski 'member' -> 'stylist', geçersiz -> 'viewer'", () => {
  assert.equal(normalizeRole("member"), "stylist");
  assert.equal(normalizeRole("garbage"), "viewer");
  assert.equal(normalizeRole(null), "viewer");
});
