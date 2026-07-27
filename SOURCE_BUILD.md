# Source build instructions

## Environment

- Node.js >= 22
- npm

## Reproduce the submitted extension package

Run these commands from the repository root:

```powershell
npm ci
npm run typecheck
npm run test
npm run amo:lint
npm run xpi
```

The generated extension package is:

```text
artifacts/private_url_blocker-0.1.0.zip
```

## Build process

- TypeScript source files are in `src/`.
- Static extension files are in `public/`.
- `scripts/build.mjs` copies static files from `public/` to `dist/`.
- `scripts/build.mjs` bundles TypeScript entry points with `esbuild`.
- `web-ext build` packages the generated `dist/` directory.

## Generated or external files

These directories are generated or installed locally and are not part of the source package:

```text
node_modules/
dist/
dist-tests/
artifacts/
```
