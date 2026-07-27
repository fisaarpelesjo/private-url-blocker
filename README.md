# Private URL Blocker

Private URL Blocker is a Firefox extension for blocking user-defined domains and URLs.

It is built for Firefox Desktop and Firefox Android, uses Manifest V3, and stores the blocklist with the Firefox extension storage API.

## Features

- Block domains such as `instagram.com` or `reddit.com`.
- Block URL paths such as `youtube.com/shorts`.
- Add the current tab domain directly from the popup.
- Add domains or URLs manually.
- Manage the full blocklist from the options page.
- Search, edit, and remove blocklist entries.
- Import and export JSON.
- Create and restore a backup.
- Minimal blocked page with only a blocking icon.
- Firefox Add-ons / AMO packaging support.
- Firefox Android development runner via `web-ext`.

## Supported Rules

Examples:

```text
facebook.com
instagram.com
reddit.com
youtube.com/shorts
x.com/*
*.google.com
*.facebook.com
*.youtube.com
```

Input is normalized automatically:

```text
https://www.instagram.com -> instagram.com
https://youtube.com/watch?v=123 -> youtube.com
https://m.facebook.com -> facebook.com
```

The normalizer removes:

- `http://`
- `https://`
- `www.`
- `m.`
- query strings when the rule should be treated as a domain rule

## Project Structure

```text
public/
  blocked.html
  icon.svg
  manifest.json
  options.html
  popup.html
  styles.css
scripts/
  build.mjs
  run-android.mjs
  source-package.mjs
src/
  background/
  blocker/
  options/
  popup/
  storage/
  types/
  utils/
tests/
  rules.test.ts
  storage.test.ts
AMO.md
MOBILE.md
SOURCE_BUILD.md
package.json
tsconfig.json
```

## Requirements

- Node.js `>=22`
- npm
- Firefox Desktop for local testing
- Android SDK Platform Tools only if testing on Firefox Android through USB

Install dependencies:

```powershell
npm ci
```

## Development Build

```powershell
npm run build
```

Generated files are written to:

```text
dist/
```

## Load Temporarily on Firefox Desktop

1. Run:

```powershell
npm run build
```

2. Open Firefox:

```text
about:debugging#/runtime/this-firefox
```

3. Click `Load Temporary Add-on...`.
4. Select:

```text
dist/manifest.json
```

When code or manifest files change, run `npm run build` again and click `Reload` in `about:debugging`.

## Popup Usage

The popup is intentionally compact.

It shows:

- total blocked item count
- current tab domain
- button to block the current tab domain
- manual domain or URL input

The full list is not shown in the popup. Use the options page for full management.

## Options Page

The options page supports:

- add entry
- search entries
- edit entry
- remove entry
- import JSON
- export JSON
- create backup
- restore backup
- clear list

## Firefox Android Development

For temporary Android testing:

```powershell
npm run mobile
```

Variants:

```powershell
npm run mobile:beta
npm run mobile:nightly
```

This requires:

- Android developer options enabled
- USB debugging enabled
- Firefox Android remote debugging enabled
- `adb` available in PATH

More details are in [MOBILE.md](MOBILE.md).

## Packaging for Firefox Add-ons

Validate for AMO:

```powershell
npm run amo:lint
```

Build the extension package:

```powershell
npm run xpi
```

The package is generated at:

```text
artifacts/private_url_blocker-0.1.0.zip
```

Because this project uses TypeScript and esbuild, AMO reviewers may ask for a source package.

Generate it with:

```powershell
npm run source:zip
```

The source package is generated at:

```text
artifacts/private_url_blocker-0.1.0-source.zip
```

Build instructions for reviewers are in [SOURCE_BUILD.md](SOURCE_BUILD.md). AMO submission notes are in [AMO.md](AMO.md).

## Scripts

```text
npm run build       Build dist/
npm run typecheck   Run TypeScript type checking
npm run test        Build and run unit tests
npm run amo:lint    Run web-ext lint against dist/
npm run xpi         Generate the extension package
npm run source:zip  Generate the source package for AMO review
npm run mobile      Run temporarily on Firefox Android stable
```

## Privacy

Private URL Blocker does not:

- sell data
- use analytics
- show ads
- load remote code
- transmit data to developer-controlled servers

The extension uses visited URLs locally only to decide whether navigation should be blocked.

The blocklist is stored in Firefox extension storage. When Firefox Sync supports it on the target platform, Firefox may sync that storage through Mozilla infrastructure.

## Important Limitations

Firefox Desktop supports `browser.storage.sync`, but Firefox Android does not sync extension storage through the Mozilla account in the same way. Desktop and Android therefore do not automatically share the blocklist using only Firefox Sync.

Firefox `storage.sync` also has quota limits. The project stores entries in chunks to avoid the per-item storage limit, but the browser still enforces total sync storage limits. Very large lists may require a future custom cloud sync backend.

## License

MIT
