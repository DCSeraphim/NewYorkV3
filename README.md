# Seraphim New York Ecosystem Map

A single-page GitHub Pages-ready map app styled around the Seraphim website snippets: dark `#010613` base, Bootstrap-style CSS variables, orange accent treatment, portfolio-card popups and a clean sector-layer interface.

## Folder structure

```text
index.html
styles.css
app.js
.nojekyll
data/companies.csv
assets/seraphim-logo.png              optional, add yourself
assets/favicon-32x32.png              optional
assets/apple-touch-icon.png           optional
assets/company-logos/*.png            optional company logos
src/wasm/company_engine.loader.js     JavaScript fallback and optional WASM loader
src/wasm/company_engine.cpp           C++ source for optional WebAssembly validation
build_wasm.sh                         optional local build command
```

## Add the Seraphim logo

1. Save the logo as a PNG.
2. Rename it exactly:

```text
seraphim-logo.png
```

3. Put it here:

```text
assets/seraphim-logo.png
```

The HTML already points to this path:

```html
<img id="seraphim-logo" src="assets/seraphim-logo.png" alt="Seraphim Space" />
```

If the file is missing, the app shows a clean placeholder instead.

## Add company logos

Company logos are optional. Put logo files here:

```text
assets/company-logos/
```

Then add the matching path in the CSV `logo` column, for example:

```text
assets/company-logos/leolabs.png
```

## Data format

Replace `data/companies.csv` with the real New York dataset. Keep this exact header:

```text
name,sector,lat,lon,location,website,logo,notes
```

Supported default sectors:

```text
Investor
Institute
Startup
Prime
Infrastructure
Government
Other
```

To add another layer, edit the `SECTORS` object at the top of `app.js`.

## Run locally on your laptop

Do not double-click `index.html`, because the browser may block loading `data/companies.csv`. Run a local static server from inside the folder.

### Windows PowerShell

```powershell
cd path\to\seraphim-new-york-map
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

### Mac/Linux terminal

```bash
cd path/to/seraphim-new-york-map
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Upload to GitHub from the browser

1. Unzip this folder.
2. Open your GitHub repository.
3. Click **Add file**.
4. Click **Upload files**.
5. Drag the contents of the unzipped folder into GitHub. Upload the contents, not the parent folder itself.
6. Make sure `index.html` is visible at the repository root.
7. Click **Commit changes**.

## Enable GitHub Pages

1. Go to the repository **Settings** tab.
2. Click **Pages** in the left sidebar.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Set branch to `main`.
5. Set folder to `/ (root)`.
6. Click **Save**.

GitHub Pages publishes from a selected branch and folder. For simple static sites, GitHub documents using a branch source and either the repository root or `/docs` as the publishing folder.

## Upload by Git command line

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
cd YOUR-REPOSITORY
# copy all app files into this folder
git add .
git commit -m "Rebuild Seraphim New York map"
git push origin main
```

## Optional: compile the C++ to WebAssembly

The app already works without WebAssembly. It uses `src/wasm/company_engine.loader.js` as a JavaScript fallback. If you want the C++ validation engine active, install Emscripten locally and run:

```bash
bash build_wasm.sh
```

That creates:

```text
src/wasm/company_engine.js
src/wasm/company_engine.wasm
```

Commit both generated files to GitHub. Once they are present, the app automatically switches the engine status from `JS` to `WASM` in the sidebar.

## Common mistakes to avoid

- Do not upload the ZIP itself as the website. Unzip it first.
- Do not put the files inside an extra nested folder unless GitHub Pages points to that folder.
- Keep `index.html` at the publishing root.
- Keep the logo filename exactly `seraphim-logo.png`.
- Keep the CSV header exactly as shown above.
