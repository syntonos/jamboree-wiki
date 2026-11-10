# Jamboree
An open access engineering club wiki, built from Markdown with no build-time package dependencies. KaTeX and Mermaid browser bundles are included locally for math and diagrams.

Use Node.js 20 or later. No package installation is required. Run `npm run dev` to build the Markdown notes and start the local preview on port 4173. Run `npm run build` after editing notes; `npm start` serves an existing build. Set `PORT` or `HOST` to change the preview listener. Both the build step and preview server use only built-in Node modules. Run `npm test` for the build, content, filter, rendering, and server checks. `npm run check:links` validates internal note links, heading anchors, image paths, and local downloads without rewriting the generated data. Every normal build also checks links; errors include the source file and line and preserve the previous successful build. External URLs are not requested during validation.

Deploy the directory to any static host; navigation uses hash routes. The published site needs no running Node server.

## Publish to GitHub Pages

The [Pages workflow](.github/workflows/pages.yml) runs the tests and builds the notes on branch pushes and pull requests. Successful pushes to the repository's default branch deploy automatically; manual runs deploy only when the default branch is selected. The workflow follows the default branch setting, so no branch name needs to be hardcoded.

1. Open the repository's **Settings → Pages**. Under **Build and deployment**, set **Source** to **GitHub Actions**.
2. Commit and push the workflow to the default branch (currently `codex/jamboree-blueprint`), or merge a pull request containing it into that branch.
3. Open **Actions → Deploy wiki to GitHub Pages** to watch the run. To publish again without a new commit, choose **Run workflow** and select the default branch.
4. After the deployment succeeds, open the URL shown by the deployment. With the standard project domain, this repository's URL is `https://syntonos.github.io/jamboree-wiki/`.

No personal access token, repository secret, package installation, or `gh-pages` branch is needed. The workflow uses GitHub's automatic token and the `github-pages` deployment environment. If that environment has approval or branch protection rules, allow deployment from the default branch and complete any required approval.

The published artifact contains `index.html`, `assets/` (including generated notes, fonts, KaTeX, Mermaid, and resources), and `content/` for downloads stored alongside notes. Application assets and hash routes work under the `/jamboree-wiki/` project path. For project feature photos, use `image: assets/uploads/photo.jpg` without a leading slash so the browser keeps that project path.

## Content
All notes live in `content/`. Project frontmatter supports `status: current`, `past`, or `future`; `featured: true`; `order`; comma-separated `discipline` and `tags`; `lead`; `contact`; `updated` (YYYY-MM-DD); `next_milestone`; `help_needed`; and `image: assets/uploads/photo.jpg`. Add photos to `assets/uploads/`. Featured current projects appear automatically on the homepage, ordered by `order`. Project and guide hubs are assembled from the note paths. The past and future sections begin empty until projects are assigned those statuses. See `docs/project-template.md` for a complete reusable template.

Set the YouTube, Instagram, and GitHub URLs in `assets/app.js` using `SOCIAL_LINKS`. Icons appear in the desktop topbar and the mobile hamburger menu. YouTube and Instagram show a coming-soon dialog until their URLs are set; GitHub links to this wiki repository. Editing instructions are in `docs/editing.md`. Both graph views connect notes through the hierarchy and internal Markdown links. The theme button saves your choice locally. Search and graph nodes navigate to notes.

## Typography and graph
Orbitron titles and JetBrains Mono body text are bundled in `assets/fonts/` with their SIL Open Font Licenses. No external font service is needed at runtime. Light mode uses a #f8f9ff background with white panels, navigation, and footer; dark mode has no paper texture. Use the hamburger button to open or close navigation. The notes sidebar has its own header toggle and opens as a drawer on smaller screens. Press `/` to open and focus note search.

The Complete graph tab (`#/graph`) and the Overview sidebar show all project and guide notes. Overview is never a graph node. Connections follow Markdown/wiki links and the navigation displayed by hub pages. Projects connects to current projects and the Past/Future hubs; each archive connects to projects with its status. Guides connects to the four disciplines, and each discipline connects to its immediate child notes. Project pages have no Related guides sections. Every other note's sidebar shows that note and its directly linked incoming and outgoing neighbors. Unlinked notes remain separate nodes.

Both views use a direct Canvas port of the supplied vault's `Graph.jsx`, including its random initial positions, all-pairs repulsion, link springs, damping, cooling, and pointer interactions. Repulsion between separate connected components is increased by 35%; nodes joined by any path retain the original forces. There are no added pins, radial constraints, or ambient-motion forces. As in the original vault, nodes move while the simulation cools, settle, and reheat when dragged or resized. Drag nodes to move them, drag the background to pan, and pinch to zoom. Wheel zoom works in complete views; zoom buttons also work in note views. Click a node to open its note. Node size follows its displayed connection count, using the vault's sizing formula.

Node colors grade from darker central notes to lighter outer notes. Each connected component's most-connected note is its center (ties use the note path); shortest link distance determines lightness. Unlinked notes use the lightest shade. Colors are shared between complete and local views. The original reference is retained in `tests/fixtures/vault-graph.jsx` for direct source comparison tests.

Both graphs include fit controls. The Complete graph also includes fullscreen where supported and a note directory. Keyboard users can focus the canvas and use +/− to zoom and Home to reset; linked notes are also available through keyboard-accessible note links.

The faint graph grid has a small cross every five dot intervals. It shares the graph's pan and zoom coordinates. The compact topbar stays visible while the page scrolls.

## Main site
The Jamboree title/logo always opens Overview. Set `MAIN_SITE_URL` at the top of `assets/app.js` when the club’s main site is ready. The topbar and homepage “Meet the team” links use this destination. Until then, they open the explicit `#/main-site` placeholder.

## Filters, backlinks, and resources
The Projects hub and Complete graph share status, discipline, and skill filters through URL query parameters, so filtered views can be bookmarked or shared. The Skill menu uses comma-separated `tags` from each project's Markdown: name skills people can learn, and reuse labels such as `CAD modeling` or `Circuit debugging` across projects. The filtered graph includes matching projects, the guides they explicitly reference, and the connecting hub notes. Reset filters restores all projects and all notes. Filter menus support arrow keys, Home/End, type to find, Enter to select, and Escape to cancel.

Each note shows incoming links under Linked from. Write Markdown links or `[[wiki-links]]` to connect notes; the builder generates backlinks and graph edges from the same resolved links. Heading anchors and relative note paths work in both the renderer and validator.

Markdown pipe tables render BOMs and other tabular data. Place CAD, STEP/STL, KiCad, PDF, CSV, SVG, or other files in `assets/resources/<project>/` and link to them from the note. Local file links become downloads. Starter CSVs, concept diagrams, and editable briefs are included for all four current projects; they are planning materials rather than completed engineering designs. Leads and contacts start unassigned. Dates reflect the documentation update, not physical build progress.

## Navigation and search
The Complete graph link is in the top header. Find a note is an editable search field in the sidebar; on mobile it is inside the hamburger menu. Press `/` to focus search (and open the mobile menu when necessary); Escape clears it.

## Math and diagrams

Notes support inline LaTeX (`$E = mc^2$` or `\(E = mc^2\)`), display equations (`$$…$$`), and fenced `mermaid` diagrams. KaTeX and Mermaid load from bundled local assets, with no CDN dependency. See [Editing the wiki](docs/editing.md) for syntax and examples.
