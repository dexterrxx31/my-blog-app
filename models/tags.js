const { db } = require("../db/database");
const { toSlug } = require("../lib/slugs");

// csvString like "JavaScript, Web, javascript" -> deduped, upserted, linked.
// Pass `tx` to run inside an existing transaction.
async function syncPostTags(client, postId, csvString) {
  await client.execute({ sql: "DELETE FROM post_tags WHERE post_id = ?", args: [postId] });

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
    const slug = toSlug(name);
    await client.execute({
      sql: "INSERT OR IGNORE INTO tags (name, slug) VALUES (?, ?)",
      args: [name, slug],
    });
    // Look up by slug so "javascript" reuses an existing "JavaScript" tag.
    const found = await client.execute({ sql: "SELECT id FROM tags WHERE slug = ?", args: [slug] });
    if (found.rows.length) {
      await client.execute({
        sql: "INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)",
        args: [postId, found.rows[0].id],
      });
    }
  }
}

async function tagsForPost(postId) {
  const rs = await db.execute({
    sql: `SELECT t.* FROM tags t
          JOIN post_tags pt ON pt.tag_id = t.id
          WHERE pt.post_id = ?
          ORDER BY t.name`,
    args: [postId],
  });
  return rs.rows;
}

async function getTagBySlug(slug) {
  const rs = await db.execute({ sql: "SELECT * FROM tags WHERE slug = ?", args: [slug] });
  return rs.rows[0];
}

async function postsForTag(tagId) {
  const rs = await db.execute({
    sql: `SELECT p.* FROM posts p
          JOIN post_tags pt ON pt.post_id = p.id
          WHERE pt.tag_id = ?
          ORDER BY p.created_at DESC, p.id DESC`,
    args: [tagId],
  });
  return rs.rows;
}

async function allTagsWithCounts() {
  const rs = await db.execute(
    `SELECT t.*, COUNT(pt.post_id) AS post_count FROM tags t
     JOIN post_tags pt ON pt.tag_id = t.id
     GROUP BY t.id
     ORDER BY post_count DESC, t.name`
  );
  return rs.rows;
}

module.exports = { syncPostTags, tagsForPost, getTagBySlug, postsForTag, allTagsWithCounts };
