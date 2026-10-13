# PixEdit — Creative Studio

PixEdit is a Photopea-inspired educational photo editor starter project. It is a static website and Progressive Web App (PWA), suitable for free Vercel hosting.

## Current working features
- Responsive desktop and mobile layout
- Open local images and drag-and-drop images into the workspace
- Create a blank canvas
- Brush, eraser, text, crop-selection workflow, and eyedropper
- Undo and redo
- Brightness, contrast, saturation, blur, and quick filters
- Export PNG, JPG, or WEBP
- Installable PWA manifest and service worker
- Simple layers panel UI

## Important scope note
This is a starter, not a complete Photopea replacement yet. The current layers panel is a UI placeholder; full multi-layer compositing, PSD import/export, advanced selection, masks, vector editing, and professional-grade non-destructive workflows are not implemented. The crop tool asks for two points in sequence. Adjustments and filters are destructive, so use undo or keep an original copy.

## Run locally
Open `index.html` in a browser for basic testing. For install/offline behavior, serve the folder over localhost (for example with VS Code Live Server) or deploy it over HTTPS.

## Deploy to Vercel
1. Upload these files to a GitHub repository.
2. In Vercel, choose **Add New → Project** and import the repository.
3. No build command is needed; leave the framework preset as **Other** and deploy.
4. Open the deployed HTTPS URL in Chrome or Edge. Use the install icon or browser menu → **Install PixEdit** / **Install app**.
5. To make changes, edit files in GitHub and commit. Vercel redeploys automatically.

## Next development upgrades
1. Real multi-layer system with visibility, reorder, opacity, and blend modes.
2. Transform, lasso/marquee selection, fill, gradient, shapes, and masks.
3. Non-destructive adjustment layers and keyboard shortcut customization.
4. PSD import/export via a suitable library, with format limitations documented.
5. Local project save/open format.
