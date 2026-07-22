const express = require("express");
const bcrypt = require("bcryptjs");
const { db } = require("../db/database");
const posts = require("../models/posts");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

async function getUser(username) {
  const rs = await db.execute({ sql: "SELECT * FROM users WHERE username = ?", args: [username] });
  return rs.rows[0];
}

// ---- Auth ----

router.get("/admin/login", function (req, res) {
  if (req.session.userId) return res.redirect("/compose");
  return res.render("login", { title: "Log in — Daily Journal", error: null, username: "" });
});

router.post("/admin/login", async function (req, res, next) {
  try {
    const username = (req.body.username || "").trim();
    const password = req.body.password || "";
    const user = await getUser(username);

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).render("login", {
        title: "Log in — Daily Journal",
        error: "Invalid username or password.",
        username,
      });
    }

    const returnTo = req.session.returnTo;
    delete req.session.returnTo;
    req.session.userId = user.id;
    return res.redirect(returnTo || "/compose");
  } catch (err) {
    return next(err);
  }
});

router.post("/admin/logout", requireAuth, function (req, res) {
  req.session = null;
  return res.redirect("/");
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

router.post("/compose", requireAuth, async function (req, res, next) {
  try {
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
    const slug = await posts.createPost(values);
    return res.redirect("/post/" + slug);
  } catch (err) {
    return next(err);
  }
});

router.get("/admin/edit/:id", requireAuth, async function (req, res, next) {
  try {
    const post = await posts.getPostById(req.params.id);
    if (!post) return next();
    post.tagsCsv = post.tags.map((t) => t.name).join(", ");
    return res.render("compose", { title: "Edit — Daily Journal", post, errors: [] });
  } catch (err) {
    return next(err);
  }
});

router.post("/admin/edit/:id", requireAuth, async function (req, res, next) {
  try {
    const existing = await posts.getPostById(req.params.id);
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

    const slug = await posts.updatePost(existing.id, values);
    return res.redirect("/post/" + slug);
  } catch (err) {
    return next(err);
  }
});

router.post("/admin/delete/:id", requireAuth, async function (req, res, next) {
  try {
    const deleted = await posts.deletePost(req.params.id);
    if (!deleted) return next();
    return res.redirect("/");
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
