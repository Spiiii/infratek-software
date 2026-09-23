# Phase 0 — Payload/Next.js spike decision

Date checked: 2026-09-22  
Phase 0 closed: 2026-09-23
Baseline commit: `cb51bb3`  
Selected spike commits: `7f7b57f`, `d4d1f3d` (integrated as `b82134f`, `73ad325`)

## Decision

Select **Next.js 16.3.5 + Payload 3.90.1** for the implementation branch. Do not continue with the Next.js 15.4 line.

This updates the versions proposed in v4 using the package metadata available on the implementation date. `@payloadcms/next@3.90.1` declares support for:

- `>=15.2.9 <15.3.0`
- `>=15.3.9 <15.4.0`
- `>=15.4.11 <15.5.0`
- `>=16.3.3 <17.0.0`

The earlier v4 value `16.2.6+` is therefore no longer sufficient for the current Payload release. The tested Next.js 16 version is pinned exactly to `16.3.5`.

## Comparison

| Gate | Next 15.4.11 | Next 16.3.5 |
|---|---|---|
| Payload peer range | Pass | Pass |
| Existing frontend typecheck/lint/build | Not completed after security rejection | Pass |
| Payload admin/API integration | Not continued | Pass locally |
| Production dependency audit | 1 critical, 4 high, 6 moderate, 1 low | 0 critical, 0 high, 6 moderate, 1 low after safe audit fixes |
| Security gate | **Fail** | **Pass with recorded moderate exceptions** |
| Decision | Reject | Select |

Next 15 was stopped early because its critical Next.js advisories are fixed outside Payload 3.90.1's supported 15.4 range. Completing a CMS integration on that branch would not change the rejection.

## What the selected spike proves

- Existing public URLs remain unchanged after moving the current site into the `(frontend)` route group.
- Payload has a separate `(payload)` root layout and exposes `/admin/[[...segments]]` and `/api/[[...slug]]`.
- A PostgreSQL adapter, rich-text editor, generated Payload types, generated import map, `Users`, and a small `spike-pages` CRUD collection compile together.
- `Users` includes `maxLoginAttempts`, `lockTime`, a restricted `access.unlock`, first-user-only bootstrap, and admin-only user management.
- The codebase is explicitly ESM. `postcss.config.js` must consequently be renamed to `postcss.config.cjs`.
- Next 16's current React lint rules required small source corrections in the blog filter, table of contents, mobile navigation, and counter hook.
- The contact API no longer constructs Resend at module load, so a build without `RESEND_API_KEY` succeeds; a request without the key returns `503`.
- Type generation, import-map generation, TypeScript, ESLint, and production build all pass on Node `24.18.0` / npm `11.16.0`.
- Production build succeeds even when the configured PostgreSQL endpoint is unavailable. Database access is deferred until a dynamic Payload request.

Final production routes include the existing frontend plus dynamic `/admin/[[...segments]]` and `/api/[[...slug]]` routes.

## Remaining audit exceptions

After `npm audit fix`, the selected spike has seven non-high findings: one low and six moderate.

- DOMPurify is pulled through Monaco/Payload admin. npm currently reports a fix path, but the resolved Payload-compatible dependency tree still retains the advisory.
- An old esbuild is pulled through `@payloadcms/db-postgres -> drizzle-kit -> @esbuild-kit/*`; npm reports no fix. This affects migration/development tooling rather than the public request path.

These must be rechecked before production launch and whenever Payload is upgraded. They do not justify selecting the Next 15 branch, which has materially worse critical/high exposure.

## Phase 0 completion

Phase 0 is complete on branch `codex/v2-phase0`.

- Linked Neon project `orange-wave-77862035`, branch `production`.
- Installed the Neon project skills and MCP configuration requested by the project setup guide.
- Added the minimal `neon.ts` policy and ran `neon deploy`; Neon reported that the branch already matched the policy.
- Stored pooled and direct connection strings only in ignored `.env.local`; no database credential or Payload secret is tracked by Git.
- Generated and applied `20260922_074043_initial`; `payload:migrate:status` reports batch 1, `Ran: Yes`.
- Created the initial Payload administrator. A second bootstrap run correctly skipped creation because the users collection was no longer empty.
- Ran a create/read/update/delete verification against `spike-pages`; the temporary record was deleted and the check passed.
- Re-ran typecheck, lint, and the Next.js production build in the integrated working directory; all passed.
- Production routes include the existing public site, `/admin/[[...segments]]`, and `/api/[[...slug]]`.

The application uses the pooled `DATABASE_URL`. Migration scripts now deliberately replace it with `DATABASE_URL_UNPOOLED`, following Neon guidance for schema operations. The first migration had already succeeded before this guard was added; its recorded status was subsequently verified through the direct connection.

The remaining dependency audit result is unchanged: zero critical/high findings, six moderate, and one low. These exceptions remain recorded above and must be rechecked on each Payload upgrade and before production launch.

## Operational notes

- Admin email and the generated one-time password are stored only in `.env.local` as `PAYLOAD_ADMIN_EMAIL` and `PAYLOAD_ADMIN_PASSWORD`.
- Change the initial admin password after first login, then remove `PAYLOAD_ADMIN_PASSWORD` from the local environment if the bootstrap script is no longer needed.
- The connection string was shared in the task conversation. Rotate the Neon database password after confirming access, then run `neon env pull` again.
- The generated Neon MCP key has account-wide access. Revoke or replace it with a narrower credential when the MCP integration is not needed.
