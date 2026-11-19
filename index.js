const { parse } = require("node-html-parser");

function splitColumns(md, source) {
  const lines = source.split("\n");
  const protectedLines = new Set();
  const tokens = [];
  md.block.parse(source, md, {}, tokens);
  for (const token of tokens) {
    if (!["fence", "code_block", "html_block"].includes(token.type)) continue;
    for (let line = token.map[0]; line < token.map[1]; line++) {
      protectedLines.add(line);
    }
  }

  const columns = [];
  let start = 0;
  for (const [index, line] of lines.entries()) {
    if (protectedLines.has(index) || !/^---[ \t]*$/.test(line)) continue;
    columns.push(lines.slice(start, index).join("\n"));
    start = index + 1;
  }
  columns.push(lines.slice(start).join("\n"));
  return columns;
}

module.exports = {
  setupMarkdown(md) {
    const renderFence = md.renderer.rules.fence;
    md.renderer.rules.fence = (tokens, index, options, env, renderer) => {
      const token = tokens[index];
      if (!/^(horizontal|hblock)$/.test(token.info.trim())) {
        return renderFence(tokens, index, options, env, renderer);
      }

      const columns = splitColumns(md, token.content);
      const html = columns.map((column) => {
        return `<div class="garden-horizontal-block">${md.render(column, env)}</div>`;
      });
      return `<div class="garden-horizontal-blocks">${html.join("\n")}</div>\n`;
    };
  },

  setupEleventy(eleventyConfig) {
    const words = new Intl.Segmenter(undefined, { granularity: "word" });
    eleventyConfig.addFilter("horizontalBlocksReadingMinutes", (html) => {
      if (typeof html !== "string" || !html.trim()) return 0;
      const root = parse(html);
      root.querySelectorAll("pre, script, style, template").forEach((node) => node.remove());
      const prose = parse(root.toString().replace(/<\/?(?:p|div|li|h[1-6]|br|td|th|blockquote|section|tr)\b[^>]*>/gi, " ")).text;
      let wordCount = 0;
      for (const segment of words.segment(prose)) {
        if (segment.isWordLike) wordCount++;
      }
      return Math.max(1, Math.ceil(wordCount / 200));
    });
  },
};
