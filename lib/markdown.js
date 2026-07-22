const { marked } = require("marked");
const sanitizeHtml = require("sanitize-html");

// marked does NOT sanitize output — sanitizing after parse is essential.
function renderMarkdown(md) {
  const raw = marked.parse(md || "");
  return sanitizeHtml(raw, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2"]),
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title"],
      code: ["class"],
      pre: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
}

function plainText(md) {
  const html = marked.parse(md || "");
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}

function makeExcerpt(md, maxLen = 180) {
  const text = plainText(md);
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + "…";
}

function readingTime(md) {
  const words = plainText(md).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

module.exports = { renderMarkdown, makeExcerpt, readingTime };
