// Eleventy config — static-first, path-prefix aware, cache-busted assets.
// PATH_PREFIX is set in CI (e.g. "/Kumo-PO/") until a custom domain lands.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

module.exports = function (eleventyConfig) {
  // Path-prefixing uses the built-in `url` filter explicitly on every
  // internal href/src (NOT HtmlBasePlugin — combining both double-prefixes).

  // Static assets pass through untouched. Templates read image paths
  // verbatim from data, so an optimizer changing extensions needs no edits.
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/admin");
  // admin/ is passthrough-only; don't also run it through the template engine
  eleventyConfig.ignores.add("src/admin/**");

  // Cache-buster: content hash appended to CSS/JS URLs so HTML and assets
  // always deploy in lockstep (GitHub Pages CDN caches ~10 min).
  eleventyConfig.addFilter("assetHash", function (assetPath) {
    const file = path.join(__dirname, "src", assetPath.replace(/^\//, ""));
    try {
      const hash = crypto
        .createHash("md5")
        .update(fs.readFileSync(file))
        .digest("hex")
        .slice(0, 10);
      return `${assetPath}?v=${hash}`;
    } catch {
      return assetPath; // missing file: ship unhashed rather than break the build
    }
  });

  // Build-time year for the footer; the scheduled weekly rebuild keeps it fresh.
  eleventyConfig.addFilter("currentYear", () => new Date().getFullYear());

  // Money formatting: menu prices are stored as numbers (15.5 → "$15.50").
  eleventyConfig.addFilter("money", function (value) {
    if (value === null || value === undefined || value === "") return "";
    return `$${Number(value).toFixed(2)}`;
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    pathPrefix: process.env.PATH_PREFIX || "/",
  };
};
