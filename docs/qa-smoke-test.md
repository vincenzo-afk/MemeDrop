# MemeDrop smoke-test notes

The static app loaded successfully from `http://localhost:8080/index.html` and populated live meme cards. The discovery panel rendered the custom subreddit input, title heatmap, and infinite-scroll sentinel. Card metadata exposed subreddit tags and derived title tags, including `GIF` badges on animated sources.

The editor modal opened from a meme card. The browser DOM confirmed the X/Twitter, WhatsApp, Reddit, native share, Story export, and Embed controls exist. Clicking Story export changed the canvas from `500x500` to `540x960`, displayed the `9:16 STORY` badge, and showed the `9:16 Story exported!` toast. Clicking Embed opened the dialog and generated a responsive `<a><img>` snippet from the current share URL.

The repository passed `node --check script.js` and `git diff --check` with no syntax or whitespace errors. Network data should still be validated against live provider availability at deployment time.

Typing `wholesomememes` into the custom subreddit control and activating Open replaced the feed with `r/wholesomememes` results and rebuilt the title heatmap, confirming the picker is not limited to the hardcoded tabs.

Because the upstream project is a static GitHub app with no server runtime, OG tags are generated and synchronized in the browser and use the source image as the static-safe preview fallback. A serverless deployment can replace `getOgPreviewUrl()` with its image renderer route without changing the share/embed UI.
