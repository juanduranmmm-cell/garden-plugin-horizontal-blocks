# Horizontal Blocks for Digital Garden

Publish side-by-side Markdown columns from Obsidian. Columns share the available width and stack on narrow screens. Published notes with a visible title also get a reading-time estimate based on 200 words per minute, rounded up with a one-minute minimum.

![Example note showing a reading-time label and two-column Markdown blocks](screenshot.png)

## Install on Forestry.md

In Obsidian, open **Settings → Digital Garden → Plugins → Manage plugins → Browse & install**. Under **Install from GitHub**, paste the public URL for this plugin, click **Check plugin**, and confirm. Forestry rebuilds the site after installation.

To host this plugin yourself, publish the extracted files in a public GitHub repository with `garden-plugin.json` at the repository root. Use the URL of that repository in the plugin manager.

## Install manually on a self-managed garden

Copy the entire `horizontal-blocks` directory into `src/plugins/` of a plugin-enabled [Digital Garden template](https://github.com/oleeskild/digitalgarden), so the manifest is at `src/plugins/horizontal-blocks/garden-plugin.json`. Rebuild the garden. No extra packages are needed.

## Use your existing Horizontal Blocks

Write your columns with `horizontal` or `hblock` and put `---` on each separator line.

~~~markdown
```horizontal
### First column
![[first-image.png]]
---
### Second column
![[second-image.png]]
```
~~~

The garden plugin looks up published attachments across folders. Use the full vault-relative path when different folders contain the same filename. Digital Garden's Obsidian publisher discovers attachments outside code fences. The garden plugin renders those assets after they reach the site.

## Set the column backgrounds

Open **Settings → Digital Garden → Plugins → Manage plugins → Installed → Horizontal Blocks** and expand its settings. Enter a hex color such as `#334466` in **Column backgrounds** to apply it to every column. A list such as `#334466, #3E2A4D, #243D33` sets the colors in order for all blocks on the site. An empty field or position uses the theme background. Save the plugin settings to rebuild the garden.

The same setting applies to `[!horizontal]` callouts. Colors entered directly in a column in version 1.3.0 still take precedence for that column.

## Reading time

The label counts rendered words and skips fenced code. To hide it for a note, set `dgReadingTime: false` in that published note's frontmatter.
