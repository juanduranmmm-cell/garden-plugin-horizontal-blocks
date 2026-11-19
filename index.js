const { basename, posix, resolve } = require("node:path");
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

const HORIZONTAL_CALLOUT = /^\s*\[!(?:horizontal|hblock)\]\s*$/i;

function readQuotedLine(state, line) {
  const indentation = state.sCount[line] - state.blkIndent;
  const start = state.bMarks[line] + state.tShift[line];
  if (indentation < 0 || indentation >= 4 || state.src[start] !== ">") {
    return null;
  }

  return state.src.slice(start + 1, state.eMarks[line]).replace(/^[ \t]/, "");
}

function parseHorizontalCallout(state, startLine, endLine, silent) {
  const marker = readQuotedLine(state, startLine);
  if (marker === null || !HORIZONTAL_CALLOUT.test(marker)) return false;
  if (silent) return true;

  const lines = [];
  let line = startLine + 1;
  for (; line < endLine; line++) {
    const body = readQuotedLine(state, line);
    if (body === null || HORIZONTAL_CALLOUT.test(body)) break;
    lines.push(body);
  }

  const token = state.push("horizontal_blocks", "div", 0);
  token.content = lines.join("\n");
  token.map = [startLine, line];
  state.line = line;
  return true;
}

function registerPublishedImages(md, imageRoot) {
  let paths;
  let filenames;

  // Resolve legacy fences that refer to assets already in the garden.
  // Callouts usually arrive with image links converted by the publisher.
  md.inline.ruler.before("image", "horizontal_blocks_image", (state, silent) => {
    if (!state.env.horizontalBlocks || !state.src.startsWith("![[", state.pos)) {
      return false;
    }
    const embed = /^!\[\[([^\]\r\n]+)\]\]/.exec(state.src.slice(state.pos, state.posMax));
    if (!embed) return false;

    const [rawTarget, ...modifiers] = embed[1].split(/\\?\|/);
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

    const notesPrefix = "/src/site/notes/";
    const input = "/" + (state.env.page?.inputPath ?? "").replace(/\\/g, "/");
    const noteStart = input.lastIndexOf(notesPrefix);
    const noteFolder = noteStart === -1
      ? ""
      : posix.dirname(input.slice(noteStart + notesPrefix.length));
    const local = posix.join(noteFolder, target);
    const relative = target.startsWith("./") || target.startsWith("../");
    const bareName = !target.includes("/");
    const choices = bareName || relative ? [local, target] : [target, local];
    const path = choices.find((candidate) => paths.has(candidate)) ??
      (bareName ? filenames.get(target) : undefined);
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
    function renderColumns(source, env) {
      const columns = splitColumns(md, source);
      const html = columns.map((column) => {
        const background = /^\n*\{background=(#[\da-f]{6})\}[ \t]*(?:\n|$)/i.exec(column);
        const style = background ? ` style="--horizontal-block-background: ${background[1]}"` : "";
        const content = background ? column.slice(background[0].length) : column;
        return `<div class="garden-horizontal-block"${style}>${md.render(content, { ...env, horizontalBlocks: true })}</div>`;
      });
      return `<div class="garden-horizontal-blocks">${html.join("\n")}</div>\n`;
    }

    md.block.ruler.before("blockquote", "horizontal_blocks", parseHorizontalCallout, {
      alt: ["paragraph", "reference", "blockquote", "list"],
    });
    md.renderer.rules.horizontal_blocks = (tokens, index, _options, env) => {
      return renderColumns(tokens[index].content, env);
    };

    const renderFence = md.renderer.rules.fence;
    md.renderer.rules.fence = (tokens, index, options, env, renderer) => {
      const token = tokens[index];
      if (!/^(horizontal|hblock)$/.test(token.info.trim())) {
        return renderFence(tokens, index, options, env, renderer);
      }
      return renderColumns(token.content, env);
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
