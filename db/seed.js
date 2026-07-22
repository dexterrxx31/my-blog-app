require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("./database");
const posts = require("../models/posts");

// ---- Admin user (upsert from env) ----

const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;

if (!username || !password) {
  console.error("Set ADMIN_USERNAME and ADMIN_PASSWORD in .env before seeding.");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
db.prepare(
  `INSERT INTO users (username, password_hash) VALUES (?, ?)
   ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash`
).run(username, hash);
console.log(`Admin user "${username}" ready.`);

// ---- Sample posts (only if the table is empty) ----

const postCount = db.prepare("SELECT COUNT(*) AS n FROM posts").get().n;
if (postCount > 0) {
  console.log(`Posts table already has ${postCount} post(s) — skipping sample content.`);
  process.exit(0);
}

const samples = [
  {
    title: "Why I Started Writing Every Day",
    coverImageUrl: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200&q=80",
    tags: "Writing, Productivity",
    daysAgo: 21,
    content: `Writing every day sounded like one of those habits that works for other people. Then I tried it for a month, and it quietly rewired how I think.

## The rule is embarrassingly simple

One page. Every morning. No editing allowed until the page is full.

> The first draft is just you telling yourself the story. — Terry Pratchett

Most days the page is garbage. That's fine — the garbage is load-bearing. Getting the obvious thoughts out of the way is what makes room for the interesting ones.

## What actually changed

- **Meetings got shorter.** When you write daily, you notice how long it takes to get to the point — and you stop doing it out loud too.
- **Decisions got easier.** Writing a problem down is 80% of solving it.
- **Ideas stopped evaporating.** The notebook remembers so my brain doesn't have to.

If you've been meaning to start, don't build a system. Just put a page in front of yourself tomorrow morning and fill it.`,
  },
  {
    title: "A Practical Guide to Dark Mode in CSS",
    coverImageUrl: "https://images.unsplash.com/photo-1550439062-609e1531270e?w=1200&q=80",
    tags: "CSS, Web Development",
    daysAgo: 14,
    content: `Dark mode is table stakes now, and doing it well takes about twenty lines of CSS — if you set it up with design tokens from the start.

## Tokens first

Define every color once as a custom property, then override the set in one block:

\`\`\`css
:root {
  --bg: #ffffff;
  --text: #1a1a2e;
  --accent: #0f6b58;
}

[data-theme="dark"] {
  --bg: #12121a;
  --text: #e8e8f0;
  --accent: #3ddbb4;
}
\`\`\`

Every component that uses \`var(--bg)\` now themes itself for free.

## Respect the OS, then the user

1. On first visit, read \`prefers-color-scheme\`.
2. When the user toggles, save the choice to \`localStorage\`.
3. Apply the theme **before** the stylesheet paints, or you get the dreaded flash.

\`\`\`js
const saved = localStorage.getItem("theme");
const theme = saved ||
  (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
document.documentElement.dataset.theme = theme;
\`\`\`

## Don't forget

- Set \`color-scheme: dark\` so scrollbars and form controls follow.
- Test your images — pure-white logos vanish on light backgrounds.
- Dim your shadows in dark mode; they read as smudges otherwise.`,
  },
  {
    title: "Three Days in the Himalayas",
    coverImageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    tags: "Travel",
    daysAgo: 9,
    content: `The bus dropped us at the trailhead at 5 a.m., two hours late and somehow still too early. It was -4°C and the tea stall was the only light on the mountain.

## Day one: up

Eleven kilometres, all of them uphill. The trail switchbacked through deodar forest, and every hour the trees got shorter and the air got thinner. By afternoon we were above the treeline and the world turned into a postcard — the kind you don't quite believe when other people send them.

## Day two: the pass

We crossed at 4,200 metres. The last stretch was a staircase of ice cut by whoever went first that morning.

> Mountains have a way of dealing with overconfidence. — Hermann Buhl

At the top, prayer flags and a silence so complete I could hear my own pulse. We stayed twenty minutes. It felt like both seconds and hours.

## Day three: down, and what stays with you

Descending, my knees filed formal complaints, but my head was quieter than it had been in months. No signal for three days does something that no meditation app has managed.

**If you go:** carry water purification tablets, start earlier than feels reasonable, and book the homestay in the village — the dal there deserves its own blog post.`,
  },
  {
    title: "SQLite Is Probably Enough",
    coverImageUrl: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1200&q=80",
    tags: "Databases, Web Development",
    daysAgo: 5,
    content: `Every side project conversation eventually reaches the same question: *"What database should I use?"* And the honest answer, far more often than we admit, is SQLite.

## The case in numbers

- A single write takes microseconds; reads are essentially free.
- It comfortably handles **tens of thousands of requests per day** on a $5 VPS.
- The entire database is one file you can back up with \`cp\`.

## "But it doesn't scale"

Scale to what? This blog gets a few hundred readers on a good day. SQLite serves that with room for a few hundred thousand more:

\`\`\`sql
PRAGMA journal_mode = WAL;  -- readers never block the writer
\`\`\`

With WAL mode enabled, the classic "writes lock the database" complaint mostly disappears for read-heavy workloads — which is what a blog is.

## When you actually need more

Reach for Postgres when you have *concurrent writers at volume*, need remote connections from multiple servers, or want advanced types and extensions. Those are real thresholds — but check whether you've crossed them, not whether you might someday.

Start with the boring, free thing. Migrate when the pain is real. Usually, it never is.`,
  },
  {
    title: "The Art of the Second Draft",
    coverImageUrl: "https://images.unsplash.com/photo-1471107340929-a87cd0f5b5f3?w=1200&q=80",
    tags: "Writing",
    daysAgo: 2,
    content: `First drafts get all the romance — the blank page, the muse, the coffee-fuelled midnight sprint. But everything readers actually enjoy was made in the second draft.

## What the second draft is for

Not polish. **Demolition.** The second draft is where you:

1. Delete the first three paragraphs (the ones where you were warming up).
2. Find the sentence that should have been the opening — it's usually hiding near the middle.
3. Cut every phrase you're secretly proud of. If it draws attention to itself, it's drawing attention away from the point.

## A test that works

Read it aloud. Anywhere you stumble, the reader will stumble too. Anywhere you get bored, the reader stopped a paragraph ago.

> I have rewritten — often several times — every word I have ever published. — Vladimir Nabokov

## The uncomfortable truth

The gap between writers who improve and writers who don't isn't talent. It's the willingness to reread yesterday's page and admit which parts only made sense at midnight.`,
  },
];

const backdate = db.prepare(
  "UPDATE posts SET created_at = datetime('now', ?), updated_at = datetime('now', ?) WHERE slug = ?"
);

for (const s of samples) {
  const slug = posts.createPost(s);
  const offset = `-${s.daysAgo} days`;
  backdate.run(offset, offset, slug);
  console.log(`Seeded: ${s.title} (/post/${slug})`);
}

console.log("Done.");
