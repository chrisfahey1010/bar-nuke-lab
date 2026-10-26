# Deploy BAR Nuke Lab to Cloudflare Workers

## Architecture and boundaries

This project uses **Workers Static Assets**, not the legacy Pages workflow:

`GitHub main → Workers Builds → Vite dist/ → workers.dev → bardata.win`

The React application remains a browser-only dashboard. There is no Worker script, database, Google service account, Google API key, or server-side Sheet access. `wrangler.jsonc` is the deployment source of truth: only `./dist` is uploaded, with explicit single-page-application fallback. Dependencies, Git metadata, archived CSV evidence and project documentation are not in the deployed asset directory. The public GitHub repository itself intentionally contains historical data snapshots.

`public/_headers` is copied into the build and interpreted by Workers to add baseline anti-framing, MIME-sniffing, referrer, permissions and content-security headers. Its CSP limits framing, base URLs and object embedding; it is not a comprehensive script-source/XSS policy. It does not restrict the existing public Google CSV fetch or Plotly behavior.

No domain or account identifier is hard-coded into the configuration. Preparing or testing this repository does not deploy it, attach domains, modify DNS, change Google sharing or alter existing websites.

## Reproduce locally

Use the Node version in `.nvmrc` (22.23.0) and the committed npm lockfile:

```bash
npm ci
npm run check
npm run test:worker
```

- `check`: unit/component/deployment-contract tests, TypeScript/Vite production build, then an **offline deployment dry run**. It does not publish a Worker.
- `test:worker`: builds the application and runs the existing browser suite plus hosting regressions against Wrangler's **local** runtime at `http://127.0.0.1:8787`. It starts and stops its own server and refuses to reuse a listener. The two live-source cases perform public Google GETs; they never write the Sheet. A network failure is a failed live check, not permission to substitute fixtures.
- Browser setup, when needed: `PLAYWRIGHT_BROWSERS_PATH="$PWD/.browser" npx playwright install chromium`. GitHub CI installs browser system dependencies in its disposable runner; no global/system installation is needed on a workstation with the existing local browser.
- Test screenshots and metrics go into ignored `test-results*` directories. Saved historical files under `docs/` are not overwritten by new test runs.
- For manual Workers testing: `npm run build && npm run worker:dev`. Stop with Ctrl+C. The server is loopback-only and disables remote bindings.

Wrangler is pinned in `devDependencies`. The scoped `miniflare → undici@7.30.1` override patches the HTTP client in Wrangler's local emulator; the installed Wrangler release otherwise pins an affected version. Review/remove this override when upgrading Wrangler once its emulator includes the security fixes. Do not use `npm audit fix --force` to downgrade to an old deployment tool.

## Fill out the Cloudflare Worker form

Use **Create an app → select the existing GitHub repository → configure your Worker project**. Do not use “Continue to Pages.”

| Setting                        | Value                                                                     |
| ------------------------------ | ------------------------------------------------------------------------- |
| Repository                     | `chrisfahey1010/bar-nuke-lab`                                             |
| Project / Worker name          | `bar-nuke-lab` — must match `wrangler.jsonc`                              |
| Production branch              | `main`                                                                    |
| Build command                  | `npm run check`                                                           |
| Deploy command                 | `npm run deploy`                                                          |
| Preview command                | `npm run deploy:preview`                                                  |
| Enable Preview builds          | On, if desired for non-production branches                                |
| Protect with Cloudflare Access | Off for the public portfolio site                                         |
| Advanced settings → Path       | `/` (repository root)                                                     |
| Build variable                 | `NODE_VERSION` = `22.23.0`                                                |
| API token                      | **Create new token**; let Cloudflare create it for this build integration |

There is **no output-directory field to fill in**. `assets.directory: "./dist"` in `wrangler.jsonc` replaces that Pages-specific setting. Keep development dependencies installed during builds: they contain the pinned Wrangler and verification tools. Do not configure the install step to omit dev dependencies.

`npm run check` gates each Cloudflare deployment on local tests, typechecking, the build and dry-run validation. The separate GitHub Verify workflow also runs the Workers browser suite, but Cloudflare does not automatically wait for that separate workflow's result. Review its green check before manually promoting a change that needs browser verification.

### API token handling

Cloudflare documents the **Create new token** option in [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/#api-token). If prompted for a label, use `bar-nuke-lab-builds`. The label does not enforce per-domain isolation: actual account/resource permissions determine access. Cloudflare's generated token can have broader permissions than static hosting needs; review its scopes in **My Profile → API Tokens** if tighter isolation is required.

Do not edit, revoke or expand the existing `livenapalm-site` token for this setup. Do not add email-routing permissions just to silence a warning on an unrelated token. If the new-token option is absent or the new token still produces a permissions error, inspect the exact error before changing scopes.

The build system supplies deployment authentication. Do not paste a token into the repository, `wrangler.jsonc`, this chat, or a `VITE_*` environment variable. No Google credentials or other application secrets are needed.

## First deployment and domain

1. After the repository verification is green, submit the form above. The Cloudflare deployment itself still needs to run successfully; local tests and GitHub CI cannot verify an account's deployment permissions.
2. Open the assigned `https://bar-nuke-lab.<account-subdomain>.workers.dev` URL. Verify charts, desktop/mobile layout, live CSV refresh, source inspection, and a reload. The URL is assigned by Cloudflare; this document does not claim that a deployment already exists.
3. To attach the domain afterward, open the Worker → **Settings → Domains & Routes → Add → Custom Domain**, and enter `bardata.win`. Review the proposed DNS change before confirming. This is separate from repository preparation.
4. Verify HTTPS, the same behavior at `https://bardata.win`, and the response security headers. Adding a custom domain can change DNS; do not alter records for other websites.

### Make the www hostname work

`https://bardata.win` is the deployed production site. A Custom Domain matches an exact hostname; the root domain does not automatically cover `www.bardata.win`. When checked before this refresh revision, the root returned HTTP 200 but www had no DNS resolution.

To serve the same application on www, open **Workers & Pages → bar-nuke-lab → Settings → Domains & Routes → Add → Custom Domain**, enter **`www.bardata.win`**, review and confirm the DNS change, then wait for the hostname/certificate to become active. Keep the existing `bardata.win` Custom Domain. Cloudflare creates the DNS record and certificate; a CNAME alone is not a substitute for binding the hostname to the Worker.

Optionally keep the root as the canonical URL using a zone **Redirect Rule**: match `http.host eq "www.bardata.win"`, use the dynamic target `concat("https://bardata.win", http.request.uri.path)`, select **301**, and enable **Preserve query string**. The www Custom Domain supplies the proxied DNS/TLS prerequisite; alternatively follow Cloudflare's documented proxied-DNS setup for a redirect-only hostname. No redirect or DNS change is applied by application Git pushes.

References: [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/) and [www-to-root redirects](https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-www-to-root/).

The public feed remains readable and copyable. Chris reports that the Sheet's general link access has been changed from Editor to **Viewer**; that setting was not independently verified through an authenticated Google permissions API. Keep Editor access limited to trusted collaborators.

## Continuous verification

Cloudflare's GitHub app must include `bar-nuke-lab` in its **Only select repositories** access list, even though the source is public. A public repository can be cloned with read-only access without the app being installed on that repository; successful initial deployment is not proof that later GitHub push events are connected. Preserve existing repository selections when adding this one. If a push does not deploy, also check the Worker's **Settings → Build** Git connection, production branch (`main`) and automatic build trigger.

`.github/workflows/verify.yml` runs on pushes to `main`, pull requests and manual dispatch. It uses SHA-pinned GitHub actions, read-only repository permissions, the pinned Node version, `npm ci`, a dependency audit, `npm run check`, and the Workers-hosted browser suite. It has **no Cloudflare credentials and no deployment step**. Pull requests use the ordinary unprivileged `pull_request` event, not `pull_request_target`.

Cloudflare Workers Builds owns deployment authentication and production publishing. `deploy` and `deploy:preview` are explicit publishing commands; unlike `deploy:check`, they are not offline checks.

References: [Static Assets](https://developers.cloudflare.com/workers/static-assets/), [SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/), [Headers](https://developers.cloudflare.com/workers/static-assets/headers/), [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).
