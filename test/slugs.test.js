const { test } = require("node:test");
const assert = require("node:assert/strict");
const { toSlug, uniqueSlug } = require("../lib/slugs");

test("converts titles to url-safe slugs", () => {
  assert.equal(toSlug("Hello World!"), "hello-world");
  assert.equal(toSlug("  Spaces  Everywhere  "), "spaces-everywhere");
});

test("strips unsafe characters", () => {
  assert.match(toSlug("C'est déjà l'été — 100%?"), /^[a-z0-9-]+$/);
});

test("falls back to 'post' when nothing slug-able remains", () => {
  assert.equal(toSlug("!!!"), "post");
  assert.equal(toSlug(""), "post");
});

test("uniqueSlug returns the base when free", async () => {
  const taken = new Set();
  assert.equal(await uniqueSlug("hello", async (s) => taken.has(s)), "hello");
});

test("uniqueSlug appends -2, -3, ... on collision", async () => {
  const taken = new Set(["hello", "hello-2"]);
  assert.equal(await uniqueSlug("hello", async (s) => taken.has(s)), "hello-3");
});
