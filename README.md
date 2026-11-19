# Horizontal Blocks for Digital Garden

Publish side-by-side Markdown columns from Obsidian. Columns share the available width and stack on narrow screens. Published notes with a visible title also get a reading-time estimate based on 200 words per minute, rounded up with a one-minute minimum.

![Example note showing a reading-time label and two-column Markdown blocks](screenshot.png)

## Install on Forestry.md

In Obsidian, open **Settings → Digital Garden → Plugins → Manage plugins → Browse & install**. Under **Install from GitHub**, paste the public URL for this plugin, click **Check plugin**, and confirm. Forestry rebuilds the site after installation.

To host this plugin yourself, publish the extracted files in a public GitHub repository with `garden-plugin.json` at the repository root. Use the URL of that repository in the plugin manager.

## Install manually on a self-managed garden

Copy the entire `horizontal-blocks` directory into `src/plugins/` of a plugin-enabled [Digital Garden template](https://github.com/oleeskild/digitalgarden), so the manifest is at `src/plugins/horizontal-blocks/garden-plugin.json`. Rebuild the garden. No extra packages are needed.

## Write columns with images from your vault

Use the `[!horizontal]` callout and put `> ---` between columns. Keep the `>` prefix on every line. Digital Garden can read the image embeds in the callout and uploads those files when you publish the note. In Obsidian the callout uses the standard stacked layout.

~~~markdown
> [!horizontal]
> ### First column
> ![[first-image.png]]
> ---
> ### Second column
> ![[second-image.png]]
> ---
> ### Third column
> ![[third-image.png]]
~~~

To migrate an existing block, replace its opening fence with `> [!horizontal]`, remove the closing fence and add `> ` to each line of the body. Publish the note again after updating the garden plugin.

Use the full path relative to the vault for an attachment in a different folder, such as `![[Attachments/Charts/diagram.png]]`. To check whether Obsidian resolves the target, open the image from the callout in Reading view. Digital Garden uploads the file during publication. The garden plugin can also resolve the full path or a note-relative path if a raw embed refers to an image already on the site.

## Color a column

Put `{background=#334466}` on the first line of the column to set its background on the published site. Choose a six-digit hex color that contrasts with your theme's text.

~~~markdown
> [!horizontal]
> {background=#334466}
> ### Diagram
> ![[Attachments/Charts/diagram.png]]
> ---
> ### Notes
> Describe the diagram here.
~~~

## Fenced Horizontal Blocks

~~~markdown
```horizontal
### First column

Write Markdown here.
---

### Second column

Add an image, link, or list here.
```
~~~

Use either `horizontal` or `hblock`. Put each separator on its own unindented line. For a horizontal rule inside a column, use `***`. The published columns have equal widths and the page does not include Obsidian's editor controls or saved column widths.

Digital Garden's publisher skips attachment discovery inside code fences. To keep the fenced format, use public Markdown image URLs or links to files already published in the garden. If multiple published images have the same filename, use the full vault-relative path.

## Reading time

The label counts rendered words and skips fenced code. To hide it for a note, set `dgReadingTime: false` in that published note's frontmatter.
