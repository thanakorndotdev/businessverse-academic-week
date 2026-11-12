# Validation corrections
- Typecheck reproduced the self-reference error in Elysia's inferred app type. The initializer referenced app.handle in metadata alias handlers and app.server in auth handlers. Replacing those initializer references with independent handlers restored the full inferred App type; strict API and web checks then passed.
- Frontend typecheck reproduced unknown ReactNode in the presentation error conditional. Its source was an unknown error prop rather than an actual component child. Explicit Boolean(error) narrowed the condition; both typechecks passed.
- Production Vite build reproduced EISDIR in HTML asset processing. The canonical href="/" was being read as a directory by the HTML build plugin. An absolute canonical resolved it; the identical build then completed. Production metadata replaces that canonical with SITE_URL.
- Docker's first web build captured the source before the ReactNode fix and failed with that same compile diagnostic. The subsequent build uses the corrected source.
- A first test-database creation ran before the new PostgreSQL process had bound its socket. Retrying after the DB healthcheck succeeded; existing app data was not touched.
