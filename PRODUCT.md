# Businessverse Academic Week
<!-- impeccable:product-schema 1 -->
## Platform
web
## Stack
Explicitly requested academic-verse-builder: Bun, React 19/TypeScript/Vite, Elysia, PostgreSQL 16/Drizzle, Docker Compose.
## Users
Academic Week participants completing department challenges; event organizers controlling question starts and projecting results. The reference uses team access; the app supports participant/team display names and identifiers.
## Product Purpose
An eight-discipline business challenge, with three sequential questions and a completion stamp for each discipline.
## Operating Context
Participants use phones at an event; organizers use desktop dashboards and a stage display.
## Capabilities and Constraints
Admin unlocks Q1 per department; Q2 and Q3 advance automatically per participant. Only admins access rankings. Admin Top 4 and fullscreen presentation lock. Server-authoritative answers, persistent PostgreSQL, authenticated real-time streams, SEO/GEO public pages.
## Brand Commitments
BUSINESSVERSE; UBS / UTCC Business School supplied logo at image/1-UBS-UTCC-1.png. Reference: https://businessverse-academic-week.nopnathon.chatgpt.site/. User authorizes a new ergonomic UI/UX structure.
## Evidence on Hand
Supplied official logo. Reference includes Management, Marketing, E-Sport, Digital Marketing, Digital & Innovation, International, Logistics and Finance. No confirmed event date or venue. Original 24 questions, four targets, resource effects and 80-point qualifying scoring imported from the public reference application.
## Product Principles
Make the next action obvious; preserve progress; separate participant and organizer tools; never reveal answer keys or other participants' rankings to players.
## Accessibility & Inclusion
WCAG AA contrast, keyboard navigation, responsive touch targets and reduced motion.
## Open Decisions
Thai-first language inferred from reference and the user’s Thai follow-up; English interface toggle provided. No public hosting requested; deliver requested Bun/Postgres Docker application in the shared workspace. Cloudflare Sites cannot host this Docker/Postgres runtime directly.
