const { test } = require("node:test");
const assert = require("node:assert/strict");
const { renderMarkdown, makeExcerpt, readingTime } = require("../lib/markdown");

test("renders basic markdown to HTML", () => {
  const html = renderMarkdown("## Hello\n\n**bold** and *italic*");
  assert.match(html, /<h2>Hello<\/h2>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<em>italic<\/em>/);
});

test("renders code blocks and blockquotes", () => {
  const html = renderMarkdown("> quote\n\n```\nconst x = 1;\n```");
  assert.match(html, /<blockquote>/);
  assert.match(html, /<pre><code>/);
});

test("strips <script> tags (XSS)", () => {
  const html = renderMarkdown("Hello <script>alert(1)</script> world");
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("alert(1)"));
});

test("removes javascript: hrefs (XSS)", () => {
  const html = renderMarkdown("[click me](javascript:alert(1))");
  assert.ok(!html.includes("javascript:"));
  assert.match(html, /<a>click me<\/a>/);
});

test("keeps safe https links", () => {
  const html = renderMarkdown("[site](https://example.com)");
  assert.match(html, /<a href="https:\/\/example\.com">site<\/a>/);
});

test("keeps images with safe src", () => {
  const html = renderMarkdown("![alt text](https://example.com/pic.png)");
  assert.match(html, /<img src="https:\/\/example\.com\/pic\.png" alt="alt text"/);
});

test("excerpt returns short text unchanged", () => {
  assert.equal(makeExcerpt("Just a short sentence."), "Just a short sentence.");
});

test("excerpt strips markdown formatting", () => {
  assert.equal(makeExcerpt("**Bold** and [a link](https://x.com)."), "Bold and a link.");
});

test("excerpt truncates at a word boundary with ellipsis", () => {
  const text = "word ".repeat(100).trim();
  const excerpt = makeExcerpt(text, 180);
  assert.ok(excerpt.length <= 181, `too long: ${excerpt.length}`);
  assert.ok(excerpt.endsWith("…"));
  assert.ok(!excerpt.includes("  "), "no double spaces");
  // must not cut a word in half: everything before the ellipsis is whole words
  assert.match(excerpt, /^(word )*word…$/);
});

test("readingTime is at least 1 minute", () => {
  assert.equal(readingTime("short"), 1);
  assert.equal(readingTime(""), 1);
});

test("readingTime scales with word count (~200 wpm)", () => {
  assert.equal(readingTime("word ".repeat(1000)), 5);
  assert.equal(readingTime("word ".repeat(201)), 2);
});
