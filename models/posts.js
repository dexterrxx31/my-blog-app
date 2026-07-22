const { db } = require("../db/database");
const { renderMarkdown, makeExcerpt, readingTime } = require("../lib/markdown");
const { toSlug, uniqueSlug } = require("../lib/slugs");
const tagsModel = require("./tags");

async function withTags(post) {
  if (!post) return post;
  post.tags = await tagsModel.tagsForPost(post.id);
  return post;
}

async function withTagsAll(rows) {
  return Promise.all(rows.map(withTags));
}

async function listPosts() {
  const rs = await db.execute("SELECT * FROM posts ORDER BY created_at DESC, id DESC");
  return withTagsAll(rs.rows);
}

async function getPostBySlug(slug) {
  const rs = await db.execute({ sql: "SELECT * FROM posts WHERE slug = ?", args: [slug] });
  return withTags(rs.rows[0]);
}

async function getPostById(id) {
  const rs = await db.execute({ sql: "SELECT * FROM posts WHERE id = ?", args: [id] });
  return withTags(rs.rows[0]);
}

async function searchPosts(rawQuery) {
  const q = "%" + rawQuery.replace(/[\\%_]/g, (m) => "\\" + m) + "%";
  const rs = await db.execute({
    sql: `SELECT * FROM posts
          WHERE title   LIKE ? ESCAPE '\\'
             OR excerpt LIKE ? ESCAPE '\\'
             OR content LIKE ? ESCAPE '\\'
          ORDER BY created_at DESC, id DESC`,
    args: [q, q, q],
  });
  return withTagsAll(rs.rows);
}

async function slugTaken(client, slug, excludeId) {
  const rs = await client.execute({
    sql: "SELECT 1 FROM posts WHERE slug = ? AND id != ?",
    args: [slug, excludeId],
  });
  return rs.rows.length > 0;
}

function buildFields({ title, content, coverImageUrl }) {
  return {
    title,
    content,
    html: renderMarkdown(content),
    excerpt: makeExcerpt(content),
    cover_image_url: coverImageUrl && coverImageUrl.trim() ? coverImageUrl.trim() : null,
    reading_time: readingTime(content),
  };
}

async function createPost({ title, content, coverImageUrl, tags }) {
  const tx = await db.transaction("write");
  try {
    const slug = await uniqueSlug(toSlug(title), (s) => slugTaken(tx, s, -1));
    const f = buildFields({ title, content, coverImageUrl });
    const rs = await tx.execute({
      sql: `INSERT INTO posts (title, slug, content, html, excerpt, cover_image_url, reading_time)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [f.title, slug, f.content, f.html, f.excerpt, f.cover_image_url, f.reading_time],
    });
    await tagsModel.syncPostTags(tx, Number(rs.lastInsertRowid), tags);
    await tx.commit();
    return slug;
  } finally {
    tx.close();
  }
}

async function updatePost(id, { title, content, coverImageUrl, tags }) {
  const tx = await db.transaction("write");
  try {
    const existingRs = await tx.execute({ sql: "SELECT * FROM posts WHERE id = ?", args: [id] });
    const existing = existingRs.rows[0];
    if (!existing) return null;

    // Keep the slug (and its URL) unless the title actually changed.
    let slug = existing.slug;
    if (existing.title !== title) {
      slug = await uniqueSlug(toSlug(title), (s) => slugTaken(tx, s, id));
    }

    const f = buildFields({ title, content, coverImageUrl });
    await tx.execute({
      sql: `UPDATE posts SET title = ?, slug = ?, content = ?, html = ?, excerpt = ?,
              cover_image_url = ?, reading_time = ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [f.title, slug, f.content, f.html, f.excerpt, f.cover_image_url, f.reading_time, id],
    });
    await tagsModel.syncPostTags(tx, id, tags);
    await tx.commit();
    return slug;
  } finally {
    tx.close();
  }
}

async function deletePost(id) {
  // Explicit cleanup instead of relying on the foreign_keys pragma,
  // which differs between local file mode and Turso.
  const rs = await db.batch(
    [
      { sql: "DELETE FROM post_tags WHERE post_id = ?", args: [id] },
      { sql: "DELETE FROM posts WHERE id = ?", args: [id] },
    ],
    "write"
  );
  return rs[1].rowsAffected > 0;
}

module.exports = {
  listPosts,
  getPostBySlug,
  getPostById,
  searchPosts,
  createPost,
  updatePost,
  deletePost,
};
