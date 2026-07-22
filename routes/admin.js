const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db/database");
const posts = require("../models/posts");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const getUser = db.prepare("SELECT * FROM users WHERE username = ?");

// ---- Auth ----

router.get("/admin/login", function (req, res) {
  if (req.session.userId) return res.redirect("/compose");
  return res.render("login", { title: "Log in — Daily Journal", error: null, username: "" });
});

router.post("/admin/login", function (req, res, next) {
  const username = (req.body.username || "").trim();
  const password = req.body.password || "";
  const user = getUser.get(username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).render("login", {
      title: "Log in — Daily Journal",
      error: "Invalid username or password.",
      username,
    });
  }

  const returnTo = req.session.returnTo;
  // Regenerate the session id on login (session-fixation defense).
  req.session.regenerate(function (err) {
    if (err) return next(err);
    req.session.userId = user.id;
    return res.redirect(returnTo || "/compose");
  });
});

router.post("/admin/logout", requireAuth, function (req, res, next) {
  req.session.destroy(function (err) {
    if (err) return next(err);
    return res.redirect("/");
  });
});

// ---- Compose / Edit / Delete ----

function validatePost(body) {
  const title = (body.postTitle || "").trim();
  const content = (body.postBody || "").trim();
  const errors = [];
  if (!title) errors.push("Title is required.");
  if (!content) errors.push("Content is required.");
  return {
    errors,
    values: {
      title,
      content,
      coverImageUrl: body.coverImageUrl || "",
      tags: body.tags || "",
    },
  };
}

router.get("/compose", requireAuth, function (req, res) {
  return res.render("compose", { title: "Compose — Daily Journal", post: null, errors: [] });
});

router.post("/compose", requireAuth, function (req, res) {
  const { errors, values } = validatePost(req.body);
  if (errors.length) {
    return res.status(422).render("compose", {
      title: "Compose — Daily Journal",
      post: {
        title: values.title,
        content: values.content,
        cover_image_url: values.coverImageUrl,
        tagsCsv: values.tags,
      },
      errors,
    });
  }
  const slug = posts.createPost(values);
  return res.redirect("/post/" + slug);
});

router.get("/admin/edit/:id", requireAuth, function (req, res, next) {
  const post = posts.getPostById(req.params.id);
  if (!post) return next();
  post.tagsCsv = post.tags.map((t) => t.name).join(", ");
  return res.render("compose", { title: "Edit — Daily Journal", post, errors: [] });
});

router.post("/admin/edit/:id", requireAuth, function (req, res, next) {
  const existing = posts.getPostById(req.params.id);
  if (!existing) return next();

  const { errors, values } = validatePost(req.body);
  if (errors.length) {
    existing.title = values.title;
    existing.content = values.content;
    existing.cover_image_url = values.coverImageUrl;
    existing.tagsCsv = values.tags;
    return res.status(422).render("compose", {
      title: "Edit — Daily Journal",
      post: existing,
      errors,
    });
  }

  const slug = posts.updatePost(existing.id, values);
  return res.redirect("/post/" + slug);
});

router.post("/admin/delete/:id", requireAuth, function (req, res, next) {
  const deleted = posts.deletePost(req.params.id);
  if (!deleted) return next();
  return res.redirect("/");
});

module.exports = router;
