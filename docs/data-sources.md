# MemeDrop data-source notes

The feed uses `https://meme-api.com/gimme`, which exposes `title`, `subreddit`, `url`, `postLink`, `author`, `ups`, and `preview` for random subreddit memes. It does not expose post flairs/tags in the current response shape, so MemeDrop derives title and subreddit tags client-side and caches them in `localStorage` under `memedrop-tag-cache-v1`.

Direct Reddit JSON routes such as `https://www.reddit.com/r/{subreddit}/hot.json` and `https://old.reddit.com/r/{subreddit}/hot/.json` returned HTTP 403 during development. The UI therefore treats flair extraction as an additive cached field (`flair` / `link_flair_text` if a future provider supplies it) rather than making the live feed depend on a blocked Reddit endpoint.

Reference: [Meme API repository](https://github.com/D3vd/Meme_Api). Reference: [Meme API example response](https://meme-api.com/gimme/wholesomememes/5). Reference: [CORSPROXY Reddit integration notes](https://corsproxy.io/solutions/reddit/).
