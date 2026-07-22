const express = require("express");
const posts = require("../models/posts");
const tags = require("../models/tags");

const router = express.Router();

router.get("/", function (req, res) {
  return res.render("home", {
    title: "Daily Journal",
    posts: posts.listPosts(),
    allTags: tags.allTagsWithCounts(),
  });
});

router.get("/post/:slug", function (req, res, next) {
  const post = posts.getPostBySlug(req.params.slug);
  if (!post) return next(); // falls through to the 404 handler
  return res.render("post", { title: post.title, post });
});

router.get("/tag/:slug", function (req, res, next) {
  const tag = tags.getTagBySlug(req.params.slug);
  if (!tag) return next();
  const tagged = tags.postsForTag(tag.id).map((p) => {
    p.tags = tags.tagsForPost(p.id);
    return p;
  });
  return res.render("tag", { title: `#${tag.name} — Daily Journal`, tag, posts: tagged });
});

router.get("/search", function (req, res) {
  const q = (req.query.q || "").trim();
  const results = q ? posts.searchPosts(q) : [];
  return res.render("search", { title: `Search — Daily Journal`, q, results });
});

router.get("/about", function (req, res) {
  return res.render("about", { title: "About — Daily Journal" });
});

router.get("/contact", function (req, res) {
  return res.render("contact", { title: "Contact — Daily Journal" });
});

module.exports = router;
