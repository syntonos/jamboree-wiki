# Jamboree
An open access engineering club wiki, built from Markdown with no package dependencies.

Use Node.js 20 or later. No package installation is required. Run `npm run dev` to build the Markdown notes and start the local preview on port 4173. Run `npm run build` after editing notes; `npm start` serves an existing build. Set `PORT` or `HOST` to change the preview listener. Both the build step and preview server use only built-in Node modules. Run `npm test` for the build, content, filter, rendering, and server checks. `npm run check:links` validates internal note links, heading anchors, image paths, and local downloads without rewriting the generated data. Every normal build also checks links; errors include the source file and line and preserve the previous successful build. External URLs are not requested during validation.

Deploy the directory to any static host; navigation uses hash routes. The published site needs no running Node server.

## Content
All notes live in `content/`. Project frontmatter supports `status: current`, `past`, or `future`; `featured: true`; `order`; comma-separated `discipline` and `tags`; `lead`; `contact`; `updated` (YYYY-MM-DD); `next_milestone`; `help_needed`; and `image: /assets/uploads/photo.jpg`. Add photos to `assets/uploads/`. Featured current projects appear automatically on the homepage, ordered by `order`. Project and guide hubs are assembled from the note paths. The past and future sections begin empty until projects are assigned those statuses. See `docs/project-template.md` for a complete reusable template.

Set the YouTube, Instagram, and GitHub URLs in `assets/app.js` using `SOCIAL_LINKS`. Icons appear in the desktop topbar and the mobile hamburger menu. YouTube and Instagram show a coming-soon dialog until their URLs are set; GitHub links to this wiki repository. Editing instructions are in `docs/editing.md`. Both graph views connect notes through the hierarchy and internal Markdown links. The theme button saves your choice locally. Search and graph nodes navigate to notes.

## Typography and graph
Orbitron titles and JetBrains Mono body text are bundled in `assets/fonts/` with their SIL Open Font Licenses. No external font service is needed at runtime. Light mode uses a matte cardstock texture and blue drafting grids; dark mode has no paper texture. The Complete graph tab (`#/graph`) includes all notes, hierarchy connections, and Markdown links. Both graph views have a force-based layout: drag nodes to move them, drag the background to pan, and use the wheel or a two-finger pinch to zoom around the cursor or gesture center. Click a node to open its note. The Complete graph also includes pause/resume motion, fit-to-view, fullscreen where supported, and a note directory. Reduced-motion preferences start the layout paused. Keyboard users can focus the canvas and use arrow keys to pan, +/− to zoom, and Home to fit; note links also work with Enter.

## Main site
Set `MAIN_SITE_URL` at the top of `assets/app.js` when the club’s main site is ready. The Jamboree title, topbar “Meet the team”, and homepage “Meet the team” all use this destination. Until then, they open the explicit `#/main-site` placeholder. The Overview navigation always opens the wiki homepage.

## Filters, backlinks, and resources
The Projects hub and Complete graph share status, discipline, and tag filters through URL query parameters, so filtered views can be bookmarked or shared. The filtered graph includes matching projects, the guides they explicitly reference, and the connecting hub notes. Reset filters restores all projects and all notes.

Each note shows incoming links under Linked from. Write Markdown links or `[[wiki-links]]` to connect notes; the builder generates backlinks and graph edges from the same resolved links. Heading anchors and relative note paths work in both the renderer and validator.

Markdown pipe tables render BOMs and other tabular data. Place CAD, STEP/STL, KiCad, PDF, CSV, SVG, or other files in `assets/resources/<project>/` and link to them from the note. Local file links become downloads. Starter CSVs, concept diagrams, and editable briefs are included for all four current projects; they are planning materials rather than completed engineering designs. Leads and contacts start unassigned. Dates reflect the documentation update, not physical build progress.

## Navigation and search
The Complete graph link is in the top header. Find a note is an editable search field in the sidebar; on mobile it is inside the hamburger menu. Press `/` to focus search (and open the mobile menu when necessary); Escape clears it.
