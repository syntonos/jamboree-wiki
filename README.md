# Jamboree
An open access engineering club wiki, built from Markdown with no package dependencies.

Use Node.js 20 or later. No package installation is required. Run `npm run dev` to build the Markdown notes and start the local preview on port 4173. Run `npm run build` after editing notes; `npm start` serves an existing build. Set `PORT` or `HOST` to change the preview listener. Both the build step and preview server use only built-in Node modules. Run `npm test` for the build and server checks.

Deploy the directory to any static host; navigation uses hash routes. The published site needs no running Node server.

## Content
All notes live in `content/`. Project frontmatter supports `status: current`, `past`, or `future`; `featured: true`; `order`; `discipline`; and `image: /assets/uploads/photo.jpg`. Add photos to `assets/uploads/`. Featured current projects appear automatically on the homepage, ordered by `order`. Project and guide hubs are assembled from the note paths. The past and future sections begin empty until projects are assigned those statuses.

Set the YouTube, Instagram, and GitHub URLs in `assets/app.js` using `SOCIAL_LINKS`. Icons appear in the desktop topbar and the mobile hamburger menu. YouTube and Instagram show a coming-soon dialog until their URLs are set; GitHub links to this wiki repository. Editing instructions are in `docs/editing.md`. Both graph views connect notes through the hierarchy and internal Markdown links. The theme button saves your choice locally. Search and graph nodes navigate to notes.

## Typography and graph
Orbitron titles and JetBrains Mono body text are bundled in `assets/fonts/` with their SIL Open Font Licenses. No external font service is needed at runtime. The Complete graph tab (`#/graph`) includes all notes, hierarchy connections, and Markdown links. Both graph views have a force-based layout: drag nodes to move them, drag the background to pan, and use the wheel or a two-finger pinch to zoom around the cursor or gesture center. Click a node to open its note. The Complete graph also includes pause/resume motion, fit-to-view, fullscreen where supported, and a note directory. Reduced-motion preferences start the layout paused. Keyboard users can focus the canvas and use arrow keys to pan, +/− to zoom, and Home to fit; note links also work with Enter.

## Main site
Set `MAIN_SITE_URL` at the top of `assets/app.js` when the club’s main site is ready. The Jamboree title, topbar “Meet the team”, and homepage “Meet the team” all use this destination. Until then, they open the explicit `#/main-site` placeholder. The Overview navigation always opens the wiki homepage.
