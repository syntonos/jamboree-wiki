# Bundled Markdown renderers

Official npm distributions, bundled for offline static hosting. No runtime CDN requests or package installation are required. Original licenses are included in each directory.

- KaTeX 0.19.1: `katex.min.js`, `katex.min.css`, and fonts.
- Mermaid 12.2.0: standalone `mermaid.min.js` (includes its dependencies).

Obtained with `npm pack katex@0.19.1 mermaid@12.2.0 --ignore-scripts`. Package SHA-512 integrity was checked against npm registry metadata before extraction:

- katex: `sha512-jG8uKntjSEcm2EpQOh0XturpPuuC9r3Sq5HLHdsFdWZT27E672SF19QEi+of0/YeOy15lDgRhKvr5614uRrEfA==`
- mermaid: `sha512-w7nr/SFrLO7BaVTs3dQTvYSV6nYSBj0Yy9DjBhsIJtAcHqRzXSq4Pg32ujHZ/AdWsAMNEvvhbm5dt9E2tOiHzw==`
