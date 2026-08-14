# MemeDrop Design Direction

## Three stylistic approaches

### Theme Name: Dark Editorial Collage
Very Brief Intro: A charcoal, paper-textured meme workspace with loud orange markers and magazine-like information density. It keeps the familiar MemeDrop dark mode while making discovery tools feel intentional and premium.
Probability: 0.06

### Theme Name: Citrus Arcade
Very Brief Intro: A bright arcade-inspired interface with citrus colors, chunky labels, and playful motion. It makes the editor feel more like a toy than a utility.
Probability: 0.03

### Theme Name: Quiet Meme Library
Very Brief Intro: A warm off-white archive with restrained typography, crisp thumbnails, and a print-catalog sensibility. It emphasizes browsing and saving over spectacle.
Probability: 0.02

## Chosen approach: Dark Editorial Collage

### Design Movement
Contemporary editorial collage with risograph grain, torn-paper geometry, and a dark gallery interface.

### Core Principles
1. Discovery is the hero: trending words, tags, subreddit context, and live loading should feel as important as the editor.
2. Utility is expressed as visual hierarchy: small labels, dense control clusters, and high-contrast actions make the app fast to scan.
3. Warm color is reserved for decisions: orange and coral identify actions, selected filters, share routes, and export moments.
4. Texture should support—not compete with—the meme: grain, halftone, and paper cues stay subtle behind readable controls.

### Color Philosophy
Near-black graphite gives the app a focused studio atmosphere. Tangerine is the ownable action color, coral signals social energy, and acid yellow is reserved for trending keywords so the heatmap reads as a living signal rather than decoration.

### Layout Paradigm
Use a wide, asymmetric workspace: discovery controls and the heatmap sit above a responsive card rail, while the editor modal is split into a visual canvas and a compact control column. Avoid putting every element in a centered stack.

### Signature Elements
- “Fresh drop” micro-labels in orange uppercase.
- Paper-strip heatmap chips with scale based on word frequency.
- Editorial rule lines and grain overlays around dense utility sections.

### Interaction Philosophy
Every control should confirm itself immediately with a short toast, selected state, or visible loading indicator. Infinite scroll should feel like a continuous feed, while share and export actions should be explicit and reversible.

### Animation
Use 160–240ms ease-out transitions for controls, a subtle card lift on hover, and a 2-second keyword shimmer only for the heatmap loading state. GIF playback should be smooth but pause cleanly when the editor closes. Respect reduced-motion preferences.

### Typography System
Display labels use Bebas Neue for compressed editorial impact. Body copy uses DM Sans for legibility. Uppercase microcopy uses 0.08em tracking; tool labels stay at 12–13px; major section headings should remain short and left aligned.

### Brand Essence
MemeDrop is a fast, source-aware meme studio for developers and internet-native creators who want to browse, remix, and share without leaving the feed. Personality: **quick, irreverent, tactile**.

### Brand Voice
Headlines are short and punchy; CTAs describe the action instead of using generic filler. Example lines: “Find the phrase everyone is repeating.” and “Turn this drop into a story.”

### Wordmark & Logo
The mark is a flame folded into a speech bubble with a pixel spark; the wordmark should keep the existing condensed editorial treatment rather than default system text.

### Signature Brand Color
**MemeDrop Tangerine — #ff5a1f**.

