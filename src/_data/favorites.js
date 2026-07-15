// Computed at build time: the menu's most-loved dishes, ranked by how often
// they've been added to a tray (popularity.json, machine-owned — see
// docs/ANALYTICS.md §Popularity). Rendered as the "Neighborhood Favorites"
// section at the top of the menu page. Never hand-maintained.
const menu = require("./menu.json");
const popularity = require("./popularity.json");

const TOP_N = 6;

module.exports = (() => {
  const ranked = [];
  for (const section of menu.sections) {
    for (const item of section.items) {
      // Displayed thumbs = machine-owned GA count + the CMS-owned adjustment
      // (item.likesAdjust, may be negative) — two owners, two fields.
      const count = (popularity.counts[item.id] || 0) + (item.likesAdjust || 0);
      if (count > 0 && item.price) {
        ranked.push({ ...item, sectionTitle: section.title, sectionId: section.id, count });
      }
    }
  }
  ranked.sort((a, b) => b.count - a.count);
  return ranked.slice(0, TOP_N);
})();
