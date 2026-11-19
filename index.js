const { basename, resolve } = require("node:path");
const { globSync } = require("glob");
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

function registerPublishedImages(md, imageRoot) {
  let paths;
  let filenames;

  // The Obsidian publisher treats these containers as code fences. Images
  // published elsewhere in the garden can still be linked by vault path.
  md.inline.ruler.before("image", "horizontal_blocks_image", (state, silent) => {
    if (!state.env.horizontalBlocks || !state.src.startsWith("![[", state.pos)) {
      return false;
    }
    const embed = /^!\[\[([^\]\r\n]+)\]\]/.exec(state.src.slice(state.pos, state.posMax));
    if (!embed) return false;

    const [rawTarget, ...modifiers] = embed[1].split("|");
    const target = rawTarget.trim();
    if (!/\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp)$/i.test(target)) return false;

    if (!paths) {
      paths = new Set(globSync("**/*", { cwd: imageRoot, nodir: true, dot: true }));
      filenames = new Map();
      for (const path of paths) {
        const name = basename(path);
        filenames.set(name, filenames.has(name) ? null : path);
      }
    }

    const path = paths.has(target) ? target : filenames.get(target);
    if (!path) return false;
    if (!silent) {
      const token = state.push("image", "img", 0);
      token.attrs = [["src", "/img/user/" + path.split("/").map(encodeURIComponent).join("/")], ["alt", ""]];
      token.content = [target, ...modifiers].join("|");
      const label = new state.Token("text", "", 0);
      label.content = modifiers.find((value) => value.trim() && !/^\d+$/.test(value.trim()))?.trim() || basename(target);
      token.children = [label];
    }
    state.pos += embed[0].length;
    return true;
  });
}

module.exports = {
  setupMarkdown(md, { pluginDir }) {
    registerPublishedImages(md, resolve(pluginDir, "../../site/img/user"));
    const renderFence = md.renderer.rules.fence;
    md.renderer.rules.fence = (tokens, index, options, env, renderer) => {
      const token = tokens[index];
      if (!/^(horizontal|hblock)$/.test(token.info.trim())) {
        return renderFence(tokens, index, options, env, renderer);
      }

      const columns = splitColumns(md, token.content);
      const html = columns.map((column) => {
        return `<div class="garden-horizontal-block">${md.render(column, { ...env, horizontalBlocks: true })}</div>`;
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
