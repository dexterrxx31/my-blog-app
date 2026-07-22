const express = require("express");
const posts = require("../models/posts");
const tags = require("../models/tags");

const router = express.Router();

router.get("/", async function (req, res, next) {
  try {
    return res.render("home", {
      title: "Daily Journal",
      posts: await posts.listPosts(),
      allTags: await tags.allTagsWithCounts(),
    });
  } catch (err) {
    return next(err);
  }
});

router.get("/post/:slug", async function (req, res, next) {
  try {
    const post = await posts.getPostBySlug(req.params.slug);
    if (!post) return next(); // falls through to the 404 handler
    return res.render("post", { title: post.title, post });
  } catch (err) {
    return next(err);
  }
});

router.get("/tag/:slug", async function (req, res, next) {
  try {
    const tag = await tags.getTagBySlug(req.params.slug);
    if (!tag) return next();
    const rows = await tags.postsForTag(tag.id);
    const tagged = await Promise.all(
      rows.map(async (p) => {
        p.tags = await tags.tagsForPost(p.id);
        return p;
      })
    );
    return res.render("tag", { title: `#${tag.name} — Daily Journal`, tag, posts: tagged });
  } catch (err) {
    return next(err);
  }
});

router.get("/search", async function (req, res, next) {
  try {
    const q = (req.query.q || "").trim();
    const results = q ? await posts.searchPosts(q) : [];
    return res.render("search", { title: "Search — Daily Journal", q, results });
  } catch (err) {
    return next(err);
  }
});

router.get("/about", function (req, res) {
  return res.render("about", { title: "About — Daily Journal" });
});

router.get("/contact", function (req, res) {
  return res.render("contact", { title: "Contact — Daily Journal" });
});

module.exports = router;
