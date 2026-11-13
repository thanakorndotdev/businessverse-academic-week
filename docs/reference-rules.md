# Verified reference mechanics

Source inspected 2026-11-12: https://businessverse-academic-week.nopnathon.chatgpt.site/ and its public page-CF2Pd2Lp.js bundle. Public configuration was parsed with an allowlisted TypeScript AST reader; downloaded JavaScript was never executed.

Four fixed strategic targets repeat by team number: (teamNumber - 1) % 4. Growth: Sales > 145. Premium: Brand > 120 AND Risk < 55. Cost: Cash > 200000 AND Operations > 100. Customer: Customer > 130. Targets are not unique per player and are not randomized at every login. Question scenarios are shared; strategic fit depends on the assigned target.

The reference's source array order differs from its actual rendered stage order. Its final stage map uses [0,1,2,3,6,5,4,7]. The imported order preserves the rendered sequence: Management, Marketing, E-Sport, Digital Marketing, Digital & Innovation, International Business, Logistics, Finance.

The initial company state is 1,200,000 coins; sales/customer/brand/operations 50; risk 5; all capabilities false. Numeric indicators clamp between 0 and 260, risk between 0 and 100. Capabilities persist once acquired. Multi-select investment respects both the stated budget and available cash. Simulation contributes up to 40 points, target achievement after all 24 decisions adds 10, and objective-aware decision quality adds up to 30. Thresholds are strict greater-than comparisons, as in the reference.

Builder requirements take precedence over reference behavior where specified: Q1 gates are per department, Q2/Q3 advance automatically; rankings are restricted to admins; the presentation highlights Top 4. Legacy final-crisis choices remain in reference.json for provenance only. The separate Final now uses the shared eight-discipline Perfect Storm plan in game/final.ts; see final-crisis.md for scoring and API details.

Targets persist in PostgreSQL. A default is allocated from the team number upon registration. Organizer seed uses team number 0 so the first participant remains Team 1 / Growth. Organizers can override an assignment only before the first answer, under the same user-row transaction lock used for submissions. Attendees cannot change their target or submit target-fit scores.
