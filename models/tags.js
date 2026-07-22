const db = require("../db/database");
const { toSlug } = require("../lib/slugs");

const stmts = {
  insert: db.prepare("INSERT OR IGNORE INTO tags (name, slug) VALUES (?, ?)"),
  byName: db.prepare("SELECT * FROM tags WHERE name = ?"),
  bySlug: db.prepare("SELECT * FROM tags WHERE slug = ?"),
  tagsForPost: db.prepare(`
    SELECT t.* FROM tags t
    JOIN post_tags pt ON pt.tag_id = t.id
    WHERE pt.post_id = ?
    ORDER BY t.name
  `),
  postsForTag: db.prepare(`
    SELECT p.* FROM posts p
    JOIN post_tags pt ON pt.post_id = p.id
    WHERE pt.tag_id = ?
    ORDER BY p.created_at DESC, p.id DESC
  `),
  clearPostTags: db.prepare("DELETE FROM post_tags WHERE post_id = ?"),
  linkPostTag: db.prepare("INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)"),
  allWithCounts: db.prepare(`
    SELECT t.*, COUNT(pt.post_id) AS post_count FROM tags t
    JOIN post_tags pt ON pt.tag_id = t.id
    GROUP BY t.id
    ORDER BY post_count DESC, t.name
  `),
};

// csvString like "JavaScript, Web, javascript" -> deduped, upserted, linked.
function syncPostTags(postId, csvString) {
  stmts.clearPostTags.run(postId);
  const seen = new Set();
  const names = (csvString || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  for (const name of names) {
    stmts.insert.run(name, toSlug(name));
    let tag = stmts.byName.get(name);
    // Name matching is case-sensitive; fall back to slug lookup
    // so "javascript" reuses an existing "JavaScript" tag.
    if (!tag) tag = stmts.bySlug.get(toSlug(name));
    if (tag) stmts.linkPostTag.run(postId, tag.id);
  }
}

function tagsForPost(postId) {
  return stmts.tagsForPost.all(postId);
}

function getTagBySlug(slug) {
  return stmts.bySlug.get(slug);
}

function postsForTag(tagId) {
  return stmts.postsForTag.all(tagId);
}

function allTagsWithCounts() {
  return stmts.allWithCounts.all();
}

module.exports = { syncPostTags, tagsForPost, getTagBySlug, postsForTag, allTagsWithCounts };
