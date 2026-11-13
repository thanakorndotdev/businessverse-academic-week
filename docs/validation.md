# Validation — 2026-11-12

## Verified

| Check                                          | Result                                                       |
| ---------------------------------------------- | ------------------------------------------------------------ |
| Strict TypeScript, API and web                 | Pass                                                         |
| Vite production build inside Docker            | Pass                                                         |
| Docker Compose configuration                   | Pass                                                         |
| PostgreSQL, Elysia API, Nginx web healthchecks | All healthy                                                  |
| Bun engine + database/route integration        | 19 tests, 272 assertions, 0 failures                         |
| Postman against real disposable HTTP service   | 19 requests, 49 assertions, 0 failures                       |
| Public homepage and DB health over HTTP        | 200; DB connected                                            |
| Private `/admin` and `/passport` headers       | `X-Robots-Tag: noindex, nofollow`; `Cache-Control: no-store` |
| Dynamic sitemap and LLM summaries              | Served with all eight disciplines                            |
| Native Chrome desktop and iPhone 16 viewport   | Inspected and captured                                       |
| Native Chrome organizer login                  | Verified                                                     |
| Native Chrome fullscreen presentation          | Verified                                                     |
| Impeccable mechanical detector                 | No findings; run once                                        |

Bun integration tests use only `businessverse_test`. They cover original question order, fixed four-target cycling, strict target thresholds, target-aware decision quality, budget/funds validation, original resource effects, a complete 24-decision run, persistent targets, pre-play target overrides and post-play lock, anonymous/player admin denial, hidden answer keys and rankings, Q1 gate enforcement, Q2/Q3 automatic progression, a concurrent duplicate submission with exactly one accepted answer, stamp completion, server-calculated scores and role-isolated SSE events.

Postman runs against an isolated API on localhost:3002, with cloud reporting disabled. The temporary credential file is removed after execution. The test service is stopped after verification. Automated test requests target only the disposable test database.

## Browser evidence and limits

Captured in `docs/screenshots`: desktop.png, mobile.png, admin.png and presentation.png. Mobile uses Chrome's iPhone 16 viewport (393 × 852). The desktop/mobile first captures predate the final semantic-label and quiz-context changes; the overall layout is unchanged. Organizer login and fullscreen display were verified against the running app. No fabricated player records were added for screenshots.

The browser host remained unavailable; native Chrome access worked after a user-requested retry, then intermittently timed out or reported intervening window changes. Keyboard activation of the final native unlock dialog, its initial focus on Keep presenting, and background shell inertness were observed in Chrome’s accessibility tree. Final quiz visual capture, question-transition focus, full dialog focus cycling/return, populated rank animation, computed contrast, and Core Web Vitals were not verified. Source uses a native modal dialog, explicit focus on automatic question advancement, semantic controls, visible focus states and reduced-motion support. These source properties are not a claim of a complete assistive-technology or performance audit.

## Review

See [design-review.md](design-review.md) for the independent review and final per-finding verdict. The pass identified decision context, stale target guidance, focus advancement and modal behavior; fixes are recorded there. [DESIGN.md](../DESIGN.md) describes the built visual system.

## Corrections during validation

See [debug-ledger.md](debug-ledger.md). A Postman test initially used a GUID-based identifier longer than the documented 32-character limit; the API correctly rejected it. The test identifier was shortened and a fresh disposable-database run passed all 49 assertions. Application input constraints were preserved.

## Scope boundaries

This is the requested Bun/Elysia/PostgreSQL Docker application, running locally at http://localhost:8080. It was not published to a public host. Actual event dates and venue were not supplied. The builder's 24-decision qualifier, organizer-only Top 4 scoreboard and fullscreen presentation are implemented. The separate Final has since been implemented and replaced by the eight-discipline Perfect Storm plan; see [Final validation](final-crisis.md) for the current behavior and checks. The older sections above record earlier work.
