const db = require("../db/database");
const { renderMarkdown, makeExcerpt, readingTime } = require("../lib/markdown");
const { toSlug, uniqueSlug } = require("../lib/slugs");
const tagsModel = require("./tags");

const stmts = {
  list: db.prepare("SELECT * FROM posts ORDER BY created_at DESC, id DESC"),
  bySlug: db.prepare("SELECT * FROM posts WHERE slug = ?"),
  byId: db.prepare("SELECT * FROM posts WHERE id = ?"),
  slugTaken: db.prepare("SELECT 1 FROM posts WHERE slug = ? AND id != ?"),
  insert: db.prepare(`
    INSERT INTO posts (title, slug, content, html, excerpt, cover_image_url, reading_time)
    VALUES (@title, @slug, @content, @html, @excerpt, @cover_image_url, @reading_time)
  `),
  update: db.prepare(`
    UPDATE posts SET title = @title, slug = @slug, content = @content, html = @html,
      excerpt = @excerpt, cover_image_url = @cover_image_url, reading_time = @reading_time,
      updated_at = datetime('now')
    WHERE id = @id
  `),
  delete: db.prepare("DELETE FROM posts WHERE id = ?"),
  search: db.prepare(`
    SELECT * FROM posts
    WHERE title   LIKE '%' || @q || '%' ESCAPE '\\'
       OR excerpt LIKE '%' || @q || '%' ESCAPE '\\'
       OR content LIKE '%' || @q || '%' ESCAPE '\\'
    ORDER BY created_at DESC, id DESC
  `),
};

function withTags(post) {
  if (!post) return post;
  post.tags = tagsModel.tagsForPost(post.id);
  return post;
}

function listPosts() {
  return stmts.list.all().map(withTags);
}

function getPostBySlug(slug) {
  return withTags(stmts.bySlug.get(slug));
}

function getPostById(id) {
  return withTags(stmts.byId.get(id));
}

function searchPosts(rawQuery) {
  const q = rawQuery.replace(/[\\%_]/g, (m) => "\\" + m);
  return stmts.search.all({ q }).map(withTags);
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

const createPost = db.transaction(({ title, content, coverImageUrl, tags }) => {
  const slug = uniqueSlug(toSlug(title), (s) => stmts.slugTaken.get(s, -1));
  const fields = { ...buildFields({ title, content, coverImageUrl }), slug };
  const { lastInsertRowid } = stmts.insert.run(fields);
  tagsModel.syncPostTags(lastInsertRowid, tags);
  return slug;
});

const updatePost = db.transaction((id, { title, content, coverImageUrl, tags }) => {
  const existing = stmts.byId.get(id);
  if (!existing) return null;
  // Keep the slug (and its URL) unless the title actually changed.
  let slug = existing.slug;
  if (existing.title !== title) {
    slug = uniqueSlug(toSlug(title), (s) => stmts.slugTaken.get(s, id));
  }
  const fields = { ...buildFields({ title, content, coverImageUrl }), slug, id };
  stmts.update.run(fields);
  tagsModel.syncPostTags(id, tags);
  return slug;
});

function deletePost(id) {
  return stmts.delete.run(id).changes > 0;
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
