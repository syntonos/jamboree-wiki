# Jamboree
An open access engineering club wiki, built from Markdown with no package dependencies.

Run `npm run dev` and open port 4173 locally. Run `npm run build` after editing notes. Deploy the directory to any static host; navigation uses hash routes.

## Content
All notes live in `content/`. Project frontmatter supports `status: current`, `past`, or `future`; `featured: true`; `order`; `discipline`; and `image: /assets/uploads/photo.jpg`. Add photos to `assets/uploads/`. Featured current projects appear automatically on the homepage, ordered by `order`. Project and guide hubs are assembled from the note paths. The past and future sections begin empty until projects are assigned those statuses.

Set the YouTube, Instagram, and GitHub URLs in `assets/app.js` using `SOCIAL_LINKS`. Icons appear in the desktop topbar and the mobile hamburger menu. YouTube and Instagram show a coming-soon dialog until their URLs are set; GitHub links to this wiki repository. Editing instructions are in `docs/editing.md`. The connection graph connects related notes through the note hierarchy. The theme button saves your choice locally. Search and graph nodes navigate to notes.

## Typography and graph
Orbitron titles and JetBrains Mono body text are bundled in `assets/fonts/` with their SIL Open Font Licenses. No external font service is needed at runtime. The Complete graph tab (`#/graph`) includes all notes, hierarchy connections, and Markdown links. Use its zoom buttons, drag to pan, or browse the note directory. The small connected-notes graph remains on note pages.
