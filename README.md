# PixEdit — Photopea Embedded Edition

This project provides a branded, responsive PixEdit shell with the full Photopea editor embedded in an iframe.

## Deploy to Vercel
1. Replace the files in the root of your GitHub `pixedit` repository with the files in this ZIP.
2. Commit the changes.
3. Wait for Vercel to deploy and show **Ready**.
4. Open the actual deployment URL from your Vercel project.

## Important limitations
- The editing interface and editing features come from Photopea, not from PixEdit source code.
- Photopea's editor, tools, file formats, and menus are hosted by Photopea. Photopea branding/ads may remain visible.
- Basic embedding is free, but hiding Photopea branding requires the appropriate paid arrangement.
- PixEdit cannot directly inspect or change Photopea's internal interface because the iframe is cross-origin.
- Installing PixEdit as a PWA installs the branded shell; an internet connection is required to load Photopea.
- Use Photopea's own File > Save/Export options to save projects and exports.

## Files
- `index.html` — PixEdit shell and Photopea iframe
- `manifest.json` — installable app metadata
- `sw.js` — app-shell caching and cache versioning
- `icons/icon.svg` — PixEdit icon
- `vercel.json` — basic Vercel static deployment configuration
