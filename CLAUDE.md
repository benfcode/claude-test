# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

**Game Site** is a static personal portfolio and game development website. It consists of three pages — Home, About Me, and Portfolio — serving as a placeholder for upcoming game projects. The site is deployed to GitHub Pages automatically via GitHub Actions.

## Tech Stack

- **Language**: HTML5, CSS3
- **Font**: Google Fonts (DM Serif Text)
- **Hosting**: GitHub Pages
- **CI/CD**: GitHub Actions (automatic deployment on push)
- **No build tools, package managers, JavaScript, or backend** — purely static content

## Project Structure

```
/home/user/claude-test/
├── .github/
│   └── workflows/
│       ├── deploy.yml       # Alternate GitHub Pages deployment workflow
│       └── static.yml       # Primary GitHub Pages deployment workflow
├── CLAUDE.md                # This file — AI assistant guidance
├── index.html               # Home page ("Game coming soon!")
├── about.html               # About Me page
├── portfolio.html           # Portfolio page
└── style.css                # All styles (layout, colors, animations)
```

## Common Commands

This is a static site with no build process or package manager. There are no install, build, test, or lint commands.

To preview locally, open any `.html` file in a browser, or use a simple HTTP server:

```bash
# Option 1: Python
python3 -m http.server 8000

# Option 2: Node (if available)
npx serve .
```

Deployment happens automatically via GitHub Actions when changes are pushed.

## Development Guidelines

### HTML Conventions

- All pages share the same structure: `<header>` with nav, `<main>` with a `#game-container` section, and `<footer>`
- Page titles follow the pattern: `"Page Name - Game Site"` (home page is just `"Game Site"`)
- Every page includes Google Fonts preconnect links and the shared `style.css`
- Navigation links use relative paths (`index.html`, `about.html`, `portfolio.html`)

### CSS Conventions

- Single `style.css` file for all pages
- CSS reset at the top (`* { margin: 0; padding: 0; box-sizing: border-box; }`)
- Flexbox layout: body is a full-height flex column, main uses `flex: 1` to fill space
- Color scheme:
  - Background: `#8B9EB7` (grayish blue)
  - Header/footer/content cards: `#ffffff` (white)
  - Headings: `#1e3a5f` (navy blue)
  - Body text: `#333`, secondary text: `#666`, footer text: `#888`
- Interactive sparkle animation on the header `<h1>` hover (CSS keyframes)
- Nav links have hover background transition (`#e0e0e0`)

### Adding a New Page

1. Copy an existing HTML file (e.g., `about.html`) as a template
2. Update the `<title>` to follow the `"Page Name - Game Site"` pattern
3. Update the `<h2>` and content inside `#game-container`
4. Add a nav link to the new page in the `<nav>` section of **all** existing pages
5. No CSS changes needed unless the page requires unique styling

### Git Workflow

- Use descriptive commit messages
- Create feature branches for new work (branch naming: `claude/<description>`)
- Keep commits atomic and focused
- Use pull requests for merging changes

## CI/CD

Two GitHub Actions workflows deploy to GitHub Pages:

- **`static.yml`** (primary): Uses `actions/configure-pages@v5`
- **`deploy.yml`** (alternate): Uses `actions/configure-pages@v4`

Both trigger on push to the configured branch and on manual `workflow_dispatch`. They upload the entire repository directory as a Pages artifact and deploy it.

## Architecture Notes

- **No build step**: HTML and CSS are served as-is. There is no transpilation, bundling, or minification.
- **Shared layout via copy**: Each HTML page duplicates the header/nav/footer structure. There is no templating engine. When modifying shared elements (header, nav, footer), update **all three HTML files** to keep them consistent.
- **Single stylesheet**: All CSS lives in `style.css`. Styles are organized in sections: reset, body, header, nav, main, content container, footer.
- **No JavaScript**: The site is entirely HTML and CSS. Interactive effects (sparkle animation, hover states) are CSS-only.
