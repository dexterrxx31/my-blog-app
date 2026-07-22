require("dotenv").config();

const express = require("express");
const session = require("express-session");
const SqliteStore = require("better-sqlite3-session-store")(session);
const db = require("./db/database");

const publicRoutes = require("./routes/public");
const adminRoutes = require("./routes/admin");

const app = express();

app.set("view engine", "ejs");
app.set("trust proxy", 1); // secure cookies behind a reverse proxy (Heroku/Render)

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new SqliteStore({
      client: db,
      expired: { clear: true, intervalMs: 900000 }, // sweep expired sessions every 15 min
    }),
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 3600 * 1000,
      secure: process.env.NODE_ENV === "production",
    },
  })
);

// Defaults every template can rely on.
app.use(function (req, res, next) {
  res.locals.isAuthed = !!req.session.userId;
  res.locals.currentPath = req.path;
  res.locals.q = "";
  next();
});

app.use(publicRoutes);
app.use(adminRoutes);

// 404 — anything that fell through the routers.
app.use(function (req, res) {
  return res.status(404).render("404", { title: "Not found — Daily Journal" });
});

// 500 — unexpected errors.
app.use(function (err, req, res, next) {
  console.error(err);
  return res.status(500).render("error", { title: "Something went wrong — Daily Journal" });
});

const port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log(`Server started on port ${port}`);
});
