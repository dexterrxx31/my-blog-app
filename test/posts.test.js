// Model tests run against a throwaway SQLite file, never the real DB.
// This env var must be set before db/database.js is required.
const fs = require("fs");
const os = require("os");
const path = require("path");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-test-"));
process.env.TURSO_DATABASE_URL = "file:" + path.join(tmpDir, "test.db");
delete process.env.TURSO_AUTH_TOKEN;

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { init } = require("../db/database");
const posts = require("../models/posts");
const tags = require("../models/tags");

before(async () => {
  await init();
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("createPost stores derived fields and returns the slug", async () => {
  const slug = await posts.createPost({
    title: "My First Post",
    content: "## Heading\n\nSome **bold** content here.",
    coverImageUrl: "https://example.com/cover.jpg",
    tags: "Testing, Node",
  });
  assert.equal(slug, "my-first-post");

  const post = await posts.getPostBySlug(slug);
  assert.equal(post.title, "My First Post");
  assert.match(post.html, /<h2>Heading<\/h2>/);
  assert.equal(post.excerpt, "Heading Some bold content here.");
  assert.equal(post.cover_image_url, "https://example.com/cover.jpg");
  assert.ok(post.reading_time >= 1);
  assert.deepEqual(post.tags.map((t) => t.name).sort(), ["Node", "Testing"]);
});

test("duplicate titles get suffixed slugs", async () => {
  const a = await posts.createPost({ title: "Duplicate", content: "one" });
  const b = await posts.createPost({ title: "Duplicate", content: "two" });
  assert.equal(a, "duplicate");
  assert.equal(b, "duplicate-2");
});

test("tags are deduped case-insensitively", async () => {
  const slug = await posts.createPost({
    title: "Tag Dedupe",
    content: "body",
    tags: "JavaScript, javascript, JAVASCRIPT",
  });
  const post = await posts.getPostBySlug(slug);
  assert.equal(post.tags.length, 1);
});

test("updatePost keeps the slug when the title is unchanged", async () => {
  const slug = await posts.createPost({ title: "Stable Slug", content: "v1" });
  const post = await posts.getPostBySlug(slug);
  const newSlug = await posts.updatePost(post.id, { title: "Stable Slug", content: "v2 content" });
  assert.equal(newSlug, slug);
  const updated = await posts.getPostBySlug(slug);
  assert.equal(updated.content, "v2 content");
});

test("updatePost regenerates the slug when the title changes", async () => {
  const slug = await posts.createPost({ title: "Old Title Here", content: "x" });
  const post = await posts.getPostBySlug(slug);
  const newSlug = await posts.updatePost(post.id, { title: "Brand New Title", content: "x" });
  assert.equal(newSlug, "brand-new-title");
  assert.equal(await posts.getPostBySlug(slug), undefined);
});

test("searchPosts finds content matches", async () => {
  await posts.createPost({ title: "Search Target", content: "the xylophone orchestra played" });
  const hits = await posts.searchPosts("xylophone");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].title, "Search Target");
});

test("searchPosts treats % and _ literally", async () => {
  await posts.createPost({ title: "Percent Post", content: "we grew 100% this year" });
  const hits = await posts.searchPosts("100%");
  assert.equal(hits.length, 1);
  // a bare % must not act as a match-everything wildcard
  const wildcard = await posts.searchPosts("%zzz-no-such-string%");
  assert.equal(wildcard.length, 0);
});

test("deletePost removes the post and its tag links", async () => {
  const slug = await posts.createPost({ title: "Doomed", content: "x", tags: "Ephemeral" });
  const post = await posts.getPostBySlug(slug);
  const tag = await tags.getTagBySlug("ephemeral");

  assert.equal(await posts.deletePost(post.id), true);
  assert.equal(await posts.getPostBySlug(slug), undefined);
  assert.deepEqual(await tags.postsForTag(tag.id), []);
});

test("deletePost returns false for unknown ids", async () => {
  assert.equal(await posts.deletePost(999999), false);
});
