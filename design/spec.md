# YC Atlas visual specification

The full-screen design is `concept.png`, generated with the built-in Image Gen tool. It is an internal implementation reference, not a user-approved design. The final app keeps the reference's header, explorer, floating company inspector, cluster-based spatial canvas, miniature batch map, flight toolbar, view controls, and footer.

Tokens: near-black #080b10 background, charcoal #10161e surfaces, #2d3744 hairline borders, #f1f3f7 primary text, #98a8ba muted text, #ff7628 YC accent. Company constellations use muted orange, violet, blue, teal, rose and yellow. Panel radius 12px, small controls 6px, floating panels use 18–22px padding. Main text uses DM Sans, data labels IBM Plex Mono. Header 76px, baseline 1536×1024 screen, entire map fills remaining viewport.

Main screen copy: YC Atlas; A universe of startups; Find a company…; YC directory; Explore the universe; Every batch. A new constellation.; BATCH; All batches; INDUSTRY; All industries; Show connections; Company labels; Surprise me; Visit website; View on Y Combinator; YOU ARE HERE; Drag to orbit; Scroll to zoom; Fly; Enter flight; INDEPENDENT PROJECT · DATA FROM YC; OVERVIEW. Record-specific text and counts come from the directory snapshot.

Intentional corrections: generated artwork placed Stripe, Airbnb, Coinbase, DoorDash and Supabase in incorrect batches and included companies absent from the YC dataset. Real directory records determine all company names, batches, statuses and descriptions. Authentic YC directory logos replace generated logo approximations. Graph nodes, links, projection and stars are native interactive canvas rendering, as specified in the concept prompt. The map adapts to mobile with a filter button, compact toolbar and lower company drawer, preserving the same colors and component family.

Interaction model: orbit/pan by drag, wheel zoom, W/S forward/back, A/D strafe, Q/E rise/descend, Shift acceleration, arrow keys steer, Escape parks flight. Search supports keyboard navigation and focuses a company. Batch selection flies to the cohort. Cohort links represent membership and timeline, not investment or commercial relationships.
