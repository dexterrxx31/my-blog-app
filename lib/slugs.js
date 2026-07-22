const slugify = require("slugify");

function toSlug(text) {
  const slug = slugify(text, { lower: true, strict: true, trim: true });
  return slug || "post";
}

// Finds a free slug: base, base-2, base-3, ...
// existsFn(slug) resolves truthy if the slug is already taken.
async function uniqueSlug(base, existsFn) {
  let slug = base;
  let n = 2;
  while (await existsFn(slug)) {
    slug = `${base}-${n}`;
    n++;
  }
  return slug;
}

module.exports = { toSlug, uniqueSlug };
