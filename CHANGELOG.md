# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Nudges: a "Due soon" section above the late invoices with a friendly heads-up for each invoice due within the profile's days (1 to 7, default 3), in a new Heads-up tone written in the client's language. It never mentions lateness, goes by PayPal's reminder or your own email, and shows "Heads-up sent, 4 Nov" afterwards. The Profile has "Send a heads-up before the due date" and "Days before".
- A client promised a date: note the date and an optional remark on a late invoice's Nudges card or its invoice page. The card shrinks to "Promised for 10 Nov" with "Remind anyway" and the morning run drafts nothing until the day after; Home shows "Promised 10 Nov" and a marker on the due line, and a broken promise makes the next reminder firm and adds "Missed a promised date once" to the client's reason.
- If PayPal refuses a heads-up reminder before the due date, the card says "PayPal only sends its reminder once an invoice is due. Use Send my message.", counts and logs nothing, and offers only your own message for the rest of the day.
- Features: Heads-up before the due date and Promised dates.
- Database: migration 011 (heads-up tone in the reminder log, `payment_promises`, a detail column for activity rows). Run `npm run db:migrate` before deploying.
- New invoice: "Ask for part upfront" (Off, 30%, 50% or a custom percent, preselected from the chat) sends a deposit invoice now and saves the balance as a draft; Home shows balance drafts in "Ready to send" and each invoice links to the other half.
- Invoice page: "Download PDF" opens an A4 tax invoice with the GST details, the export endorsement and the LUT line (an invoice not under LUT prints a warning to add IGST with a CA instead of an endorsement); Profile has an optional business address for it.
- New invoice: a notice when the chat names a different currency from the form ("The chat mentions € but this invoice is in USD") with a button to switch, and one when the prices in the chat are in rupees (a chat that names euros or dollars and also says "about ₹80k" gets none).
- Invoice page: a balance draft is dated with the day it is sent, keeping the days to pay, before PayPal sends it; if the update fails nothing is sent.
- Features: Deposit and balance, Currency check and Printable GST invoice.
- Docs: README rewritten for judges, with an animated story and an animated workflow diagram (docs/media).
- Home: a "Tour the demo" card at the top, with the README's two-minute path as eight links (the sample chat, last month's export register, the late client furthest behind and so on, all worked out from the data on Home) and a Dismiss button. It is part of Customise, is remembered per browser, and comes back after signing in to the demo or resetting it. New invoice opens with the sample chat for `?sample=1` and the export register opens on the month in `?month=YYYY-MM`.
- Export register: the PayPal and bank grids end with a pinned totals row ("Total for October 2026": the count of payments, the rupees and, for PayPal, the amount, fee and net in each currency), and each has an "Export grid as CSV" button that uses AG Grid's CSV export for the columns on screen, without the totals row (`dueline-paypal-2026-10.csv`). The CSV for your CA is unchanged.
- `npm run ai:eval` prints the totals in the shape of the report and of the README's AI table, with a purpose code check; `npm run ai:eval -- --write` also replaces docs/evaluation/extraction.md.
- Docs: a Postman collection for offline mode (docs/postman) that signs in, lists invoices, drafts from the sample chat, creates a deposit and balance, sends the balance, sets and removes a promised date, lists reminders and reads the export register, with a test in each request.
- Docs: architecture.md starts with a "Read This First" box.

### Fixed

- New invoice: payment terms in days or a date in the chat ("net 15", "payment in 15 days", "due on 2026-12-05") now always set the due date, even when the AI files them as a payment term; a payment term that only restates them is dropped. The 14-day default applies only when the chat states nothing.
- `npm run ai:eval` scores "Item lines right" (quantity, price and currency per line, any order) apart from "Item names as in the example", and the report names the model that answered each chat.
- Home: pointing at "Paid" in the status filter no longer makes the filter scroll or the row around it shake. The sliding pill is now clipped to the track, so its spring cannot run past the end, and every item keeps one weight so choosing an item does not resize the track. The app tabs and the site menu get the same fix.
- Home: the counts in the status filter are small badges after each label ("Overdue 2") instead of part of the word, with the name "Overdue, 2 invoices" for screen readers. On a phone the four items still fit on one line.
- Nudges: after "Send PayPal reminder" or "I sent it" on a Due soon card, the card replaces its reason with "Heads-up sent, 5 Nov", locks its buttons and leaves the section within the visit, with a short status line, where it kept saying "no heads-up sent yet" until the page was reloaded. The section's count drops and the section hides when it is empty.
- Export register: from 1280 px up the PayPal grid cut dates ("14 Oct 20…"), client names, amounts and transaction IDs. No column now shrinks below the room its values need, and the transaction ID sits on two lines.
- Nudges: messages you send from your own email no longer count against PayPal's two reminders a day, so recording two of them no longer disables "Send PayPal reminder" on the other cards.
- `npm run ai:eval` never writes to the database named in `DATABASE_URL`: its usage counters are kept in memory.
- New invoice: "No payment terms in the chat" was about the due date, so it now says "No due date in the chat; set to 14 days from today", and the "Client's payment terms" notice is left out when it only repeats a half upfront ("the rest when you deliver"). The upfront notice no longer quotes the chat a second time beside the control.
- The note PayPal shows for an invoice under LUT now says "under bond or Letter of Undertaking", as Rule 46 and the printed invoice do, and a balance note is kept inside PayPal's 4,000 characters with the LUT lines. Invoices made before still count as under LUT.
- Invoice page: "Print or save as PDF" is dark on white in the dark theme, where it was an invisible white pill.
- New invoice: on a short laptop screen (1366 × 650) the Summary scrolls on its own and "Create and send invoice" stays in reach.
- The public pages no longer scroll sideways at 768 px: the site bar keeps its tabs on their own row until 1024 px.
- Built on PayPal: the four payment cards are the same height, and the dot crosses three rails in turn and rests for the last quarter of its cycle.
- Sign-in: the sample invoice on the picture is sent 15 days ago and due in 2 days, worked out from today instead of two fixed dates.
- A balance saved days ago is dated with the sending day when it is sent, keeping its days to pay: tested end to end, across midnight in India.
- The first screens after a server start share one read of the stored invoice snapshot, where each screen request read it separately.
- A reset or a morning run fetches the exchange rates behind the demo story's payment dates, so the first screen opened afterwards does not wait for the rate service.
- Demo: a demo profile saved before the business address existed is recognised and upgraded after a reset, so the printed invoice shows the address; a profile you edited is still never replaced, and an address you typed is kept.
- New invoice: the sample chat now has Mike asking to pay half now, so "Use a sample chat" shows the upfront option (50%, $225.00 deposit and balance) the README describes.
- New invoice: the summary now shows PayPal's fee, the currency conversion and the total lost as three lines that add up, instead of counting the fee twice. The landing page and How it works use the same figures.
- How it works: step 2 is the same €610.00 invoice that step 1 drafts, with its fee, conversion and rupees worked out from it.
- Nudges: a reminder no longer says thank you twice (once in the text, once in the sign-off), "it is likely just slipped your mind" reads "it may have slipped your mind", and the French templates no longer open their request with "Merci". Stored drafts are written again.
- The dark pill in the top tabs follows the page you are on: it no longer stays under a tab you passed over when you open an invoice, the account menu or another window.
- PayPal sandbox buyers show as "PayPal sandbox buyer" instead of a long generated address; real addresses wrap or truncate with the full address on hover.
- A brand kit (logo, business cards, brand guidelines) is suggested as P1099, like the same work elsewhere, and the AI now sees each purpose code's examples. New invoice chat 26 in the evaluation set checks it.
- A payment PayPal has reported the fee for shows "PayPal fee · est. rate" instead of "est.", and the export register counts it as PayPal's figures.
- The browser tab for Home says "Home".
- The late-payer card on the landing page now says "12 days on average", as the demo does everywhere.
- For your CA: "Sample rows from the demo" is the table's caption, once. The public pages and the sign-in page balance their headings and the last line of their intro text.
- Home: Clients behind says "About ₹71,038 overdue." and gives the basis ("Based on 2 invoices.") only when it is under 3 invoices. Activity shows the 6 newest events with "Show all 16" and "Show fewer".
- Invoice page: a paid invoice has one "View on PayPal" link and no copy button, a cancelled one has neither. History no longer lists a due date after a payment that came on or before it. Client in the facts card shows the country before the email when it is known.
- New invoice: the review step opens at the top with the focus on its heading, and Country is filled in for a client Dueline already knows. The built-in sample chat no longer raises price warnings: a price is accepted when it is written anywhere in the chat ([decision 0010](docs/decisions/0010-ai-invoice-drafting.md)).
- Nudges: the Today band builds its line from the invoice as it is today, so its days late match the card below it.
- Rupee rates are shown to the paisa (₹94.91, not ₹94.9095) everywhere they are text; fields you edit keep every digit.
- Demo story: the October bank transfer for the Brightwell Labs icon set has the FIRC number FIRC/2026/001, so the register shows "1 FIRC added".

### Changed

- Docs: the extraction evaluation is rerun over 27 chats (6 Nov 2026) and the README, architecture and report show those figures; the licence names both authors.
- Footer: the "Built for the PayPal AI Hackathon 2026" chip is gone from the website.
- Every green "live" dot (landing badge, sign-in chip, Home and the account menu) is one shared dot with a soft glow and a slow pulse; the pulse stops under reduced motion. On Home, "PayPal sandbox connected" is a light green pill, and a failed or pending check shows a still dot.
- Built on PayPal: "How a payment reaches Dueline" is one payment travelling card to card, with each card lit as it arrives, instead of three dots running at once.
- Demo story: a sixth client, Southbank Creative (Australia, A$ invoices paid early by bank transfer), so the Clients page fills two rows of three.
- New invoice: the empty chat box asks for a chat in one line, and the greyed Draft invoice button says "Paste a chat or use the sample to start".
- New invoice: a client who asks for "50% now" or other payment terms gets an amber notice with their own words. The terms are a notice only; nothing on the invoice changes.
- New invoice: Export under LUT starts ticked when the profile has a LUT ARN that has not run out, and the demo's offline paid invoices are all under LUT.
- Late-payer radar: a client with 0 or 1 paid or overdue invoices and none late is "New" ("Paid on time once.") instead of "Reliable"; Reliable needs 2. The demo's Halden Coffee Co. is Reliable.
- Reminders: a client in Portugal, Brazil, Germany, Austria, Switzerland, France, Luxembourg, Spain, Mexico, Argentina, Colombia, Chile, Peru or the Netherlands is offered reminders in their language on the client page and on Nudges, with "Use Portuguese" and "Keep English" style buttons; either answer is saved and ends the question.
- Reminders: a firm or final draft always says when the invoice was due and how many days overdue it is, and greets the contact by first name ("Hi Lena,") when the invoice has one. New invoice has a Contact name field that goes to PayPal as the recipient's name, and the demo's clients have contacts.
- New invoice: the green privacy pill shows only when an email or phone number was hidden.
- Features: a first group, "Draft in seconds", for chat to invoice, the seven reminder languages and the item library.
- Offline drafting reads WhatsApp exports (iOS and Android lines) and takes the company in brackets as the client and the person as the contact; the AI sees the chat without the date prefixes.
- Faster first load: the PayPal invoices are kept in a stored snapshot that is refreshed in the background, so Home and Nudges fill in about a second after the demo has been idle. A page asks once for the profile, the invoices and the demo buyer, draws each part as it arrives, and shows its last answer when opened again until you change something or lock the demo. Due and late states are worked out on every read, so a snapshot from yesterday is right today. "Updating from PayPal…" shows while a snapshot older than five minutes is being replaced.
- A full site footer, and sandbox wording that explains what judges can do.
- The demo story keeps something due soon on every day of its seven-day life (Tandem Health is now due in 7 days at the start), and a test checks it for 1 to 15 December.
- When Gemini is busy or out of quota, New invoice says "The AI is busy right now. Try again in a minute, or fill the invoice in yourself." and offers "Start without a chat" as the main button.
- A page that loads after the database or functions were asleep reads again once before it shows an error, and a network failure says "Could not reach Dueline" instead of the browser's own wording. The health check and the demo sign-in try the database a second time before they fail.
- The sign-in limit is ten attempts in fifteen minutes per browser (a random id in its own cookie) and sixty per address, so people sharing one office network no longer lock each other out.
- The daily job adds the "paid" row to Activity for a PayPal payment whose webhook never arrived. Whichever of the webhook and the job comes second adds no second row for the invoice.
- Create and send, and Send PayPal reminder, ignore a second click made in the same moment.
- `.env.example` says for every setting whether it is for live, offline or both, with an example.

### Docs

- Docs: architecture document rewritten with animated flow diagrams.
- README rewritten for the PayPal AI Hackathon 2026: what Dueline does, how it uses PayPal, AI and AG Grid, how to try it and how to run it, with screenshots in `docs/images/`.
- The extraction evaluation is regenerated with today's results. It compares amounts as numbers and names without regard to case or spacing, and its report names each item, so a difference in wording no longer reads as "12 x 65.00 against 12 x 65.00".

### Changed (Redesign, phase 1)

- A new look for every screen ([decision 0023](docs/decisions/0023-visual-redesign.md)): Outfit and Figtree fonts, a new colour palette in both themes, an animated page background, frosted-glass cards, pill buttons and rounded fields. Nothing moved and no text changed. The reminder tone buttons and the status and risk badges follow the same style, and the due line's hover card is drawn outside its card so it keeps its place.
- Added a sliding-pill segmented control (`Segmented`) for the next phases; no screen uses it yet.

### Changed (Redesign, phase 2)

- The sidebar is now a top bar ([decision 0023](docs/decisions/0023-visual-redesign.md)): the new Dueline mark, five sliding glass tabs (Receivables is now called Home), search, the theme switch and an account button with your initials. The account menu holds Profile, Fees and rates, Demo tools (demo mode), the connection status and Lock demo, and the button shows a dot when a rate alert is triggered. On a phone the tabs sit in a second row that scrolls sideways.
- The tab icon, the home-screen icons and the app theme colour follow the new mark.

### Changed (Redesign, phase 3)

- Home has a new look ([decision 0023](docs/decisions/0023-visual-redesign.md)): a greeting with the date and the PayPal connection, one-line This morning and Getting started strips, three big totals cards, a due line with a label column, What will arrive next and Clients behind beside it, a table with a sliding status filter and a search pill, and What getting paid costs with the rupee rate in it. The overdue days are in the Status pill, so the Days late column is gone, and the filter no longer has an "Unpaid" button. With no Days late column there is no sort by it; sort by Due instead. The late clients region is now called "Clients behind" and says under each name how often the client has paid late ("Late on 3 of 3 · 12 days on average"). On a phone each due-line row stacks the name, the line and the label. Your widget order is reset once to the designed one; upcoming due and rupee rates are in Customise and hidden until you show them.

### Changed (Redesign, phases 4 and 5)

- Clients, the client page and the invoice page have the new look ([decision 0023](docs/decisions/0023-visual-redesign.md)). Clients are cards (billed, owed, how long they take to pay, why they are rated as they are) instead of a table, and the search matches email as well as name. The client page has an avatar, a tinted reason strip with the early-payment offer, three totals cards and the merge card in one row. On the invoice page the payer link, copy and reminder buttons are in the header, the back link says "Home", the amount sits beside a blue panel of what reaches your bank, and History is a timeline.
- New invoice and Nudges have the new look. A step pill and a heading change with each step, notes about the draft are coloured pills, the early-payment discount is in the Details card, and the summary has the create button in it. Each nudge shows PayPal's reminder and your own message as two panels, a note replaces the PayPal button once it has gone today, and the tone is the shared sliding control marked "suggested". The "Today" queue is a navy band. On the client page an invoice paid late says how late in its status pill, and the email preview opens across the whole nudge card.

### Changed (Redesign, phase 6)

- Export register, Profile, Fees and rates, Demo tools, the 404 page and the not-configured page have the new look ([decision 0023](docs/decisions/0023-visual-redesign.md)). The register shows four totals (invoices paid, rupees received, on PayPal's FIRA, by bank transfer), the invoice numbers link to the invoices and the GSTR-1 button is called "GSTR-1 rows (CSV)". Fees and rates shows how each rate sits against its 30-day average, and the calculator reads like the design.
- The public website has four new pages (How it works, Features, For your CA, Built on PayPal), a site top bar and footer, a new landing page and a sitemap. The demo password page is a split page; its button now reads "Continue" and the password can be shown.
- Switching between light and dark is now instant, with no circle animation.

### Changed (Redesign, review)

- Copy and names: "Sign-off" (was "Reminder sign-off"), the preview heading "How your invoice header looks", the calculator label "For an invoice of", and "Connect PayPal · coming next" on the profile. The export register's purpose code column is headed "Code" with a "Purpose code" tooltip, and the four summary cards replace "Totals by proof".
- The fees calculator shows "After PayPal's fee", the amount in the invoice's currency, under "PayPal fee" again.
- Every switch is green when on (`#0e8a4f` in light, `#34c27a` in dark).
- The demo password page: Continue is always available, and sending it with an empty password shows "Enter the demo password." and sends nothing. After any password error the cursor returns to the password field. The Show and Hide button is named "Show password" and "Hide password". The split page with floating cards starts at 1280 px; narrower windows get the short band.
- The rates table turns into one block per currency below 768 px, and the calculator amount fits at 360 px. The export register fits its card at every width: under 1280 px the LUT and Fee columns are hidden and the transaction ID sits under the client name, and the empty space under the table is gone.

### Added

- Screens that answer their question ([decision 0022](docs/decisions/0022-screens-that-answer.md)). The invoice number in the Receivables table opens the invoice page and PayPal is an icon link, so all eight columns fit a 1366 px laptop; the risk badge sits under the client's name. The invoice page lists issued and due dates, days late, the client's email and country, the work, the purpose code with its label, the LUT line with its ARN and the client's average days to get paid, and asks in the page before cancelling. The due line moves an end label that would touch the Today line, marks a line that starts before the chart and shows every invoice number.
- New invoice: the late-payer radar sits under the Client card, its offer fills the one early-payment discount control, the summary shows PayPal's fee and the conversion loss, and the chat box shows an example and says emails and phone numbers are hidden from the AI.
- The export register opens on the latest month with payments when the current month has none, says so, turns the CSV off (with a reason) for an empty month, shows one rupee figure with one note, and has a Bank transfers table with an editable FIRC / e-BRC number and two totals.
- Nudges: a Preview of the personal email as "Send my message" fills it, and each card shows the client's average days to get paid. The Nudges menu item counts overdue invoices.
- Merge a client into another from the client page (and Unmerge), stored as an alias. A merged invoice carries `mergedFrom` (the name on the PayPal invoice); the target keeps its own country and email.
- A first-run checklist on Receivables that ticks itself, and can be hidden for good.
- Open Graph and Twitter metadata, a generated share image and `robots.txt`.
- "Nothing due" for an empty forecast window, "Invoice 0015 · Northpine Studio (CA$380.00)" in This morning, search placeholders, and a more compact sidebar.

- The demo story now has generations. Pressing "Reset the demo" starts a new one dated from today, and the daily run starts one after 7 days, so the story never ages out. Old open story invoices are cancelled; invoices without a Dueline marker, older story invoices that were not paid through PayPal, cancelled invoices and invoices hidden with "Hide from the demo" (invoice page, demo mode only) are left out of every screen and export. The story gains a second Halden Coffee Co. invoice, a country for every client, the LUT line and SAC on its invoices, one past gentle reminder, and its own Activity rows and invoice histories on the story's dates. Invoice histories also show when each invoice fell due and when it became overdue ([decision 0021](docs/decisions/0021-demo-generations-and-human-reminders.md)).
- Receivables shows "Paid in the last 30 days" (through PayPal and recorded outside PayPal), and the dashboard data and each client carry how long clients take to pay and how many pay on time.
- The export register lists bank transfers beside PayPal's payments, with a place for the bank's FIRC or e-BRC number. The CSV for the CA has a Proof column, and the totals keep PayPal FIRA rupees and bank rupees apart. The register reports the newest month with payments.
- A client country: read from the chat when it states one, chosen on the review screen, sent to PayPal as the billing country, and shown in the export register.
- A "Connect your PayPal" card on Profile describing the next step for many freelancers.

- Offline mode: `npm run dev:offline` runs the whole app with no PayPal account, Gemini key or
  database (open localhost:3000, password `offline`). PayPal is a simulation that holds the demo story
  and four invoices paid through PayPal, invoices are drafted from a chat by a small parser, reminders
  are templates, and rates are the saved ones. It refuses to run on Vercel or in production outside CI,
  and the sidebar shows an "Offline demo" badge. `GET /api/health` reports `offline`. Fees and rates,
  the rupee rates widget and the payout estimate call the rates "Saved rates (offline demo)".
- End-to-end tests with Playwright in Chromium (`npm run test:e2e`) against the production build in
  offline mode: the landing page and password, a chat to a sent invoice and a double click, a reminder
  and a tone switch, the export register and its CSV, a bad GSTIN, the theme and the keyboard. Axe
  checks six screens in both themes. CI runs them in a separate `e2e` job after `checks`.
- An extraction accuracy check: 24 chats with expected answers (`tests/fixtures/chats`) and
  `npm run ai:eval`, which runs the real model over them and writes `docs/evaluation/extraction.md`.
  No report has been generated yet.
- A full Content Security Policy: everything from this site, no framing, no plugins, forms post only
  here. Scripts still allow inline code; [decision 0020](docs/decisions/0020-proof-and-hardening.md)
  explains why a nonce cannot be used with prerendered pages.
- Two design documents: [decision 0019](docs/decisions/0019-many-freelancers.md), a proposal for
  serving many freelancers (not built), and diagrams of today's system and of that design in
  `docs/architecture.md`.

- A daily preparation each morning (06:00 India time, Vercel Cron). It writes reminder drafts for
  overdue invoices, lists the ones at least 3 days late (a setting) in a Today list at the top of
  Nudges with "Review and send" and "Dismiss for today". Items stay until acted on or dismissed;
  reminder items are refreshed by each run, retainer items stay until sent or dismissed. It turns monthly repeats into drafts, and
  records a digest. It never sends anything: every item is a place to start. It runs once a day,
  protected by `CRON_SECRET`; "Run today's preparation now" on Demo tools runs the same job.
- Monthly repeats for retainer clients: "Repeat monthly" on an invoice saves a schedule (day 1 to 28),
  the client page lists the client's repeats with pause and delete, and a due repeat becomes a draft
  that opens New invoice filled in.
- An item library: "Save to library" on an invoice item, a searchable "Add from library" on New
  invoice, and rename and delete on Profile.
- Reminders in the client's language (English, German, French, Spanish, Dutch, Portuguese, Hindi),
  set on the client page. Templates exist for each, the same checks apply to amounts written in that
  language's number format, and a card can switch back to English.
- A "This morning" card at the top of Receivables: paid since yesterday, newly overdue, due in the next
  3 days and drafts prepared. Up to three rate alerts in Settings (for example USD above ₹96) are marked
  on the Rates widget, counted in the sidebar and listed in the digest, with an optional notification in
  this browser while the app is open.
- Light and dark themes with one toggle button in the sidebar and the phone top bar. A first visit follows the device, the choice is then kept, and the new theme grows from the button as a circle unless motion is reduced.
- A command palette (Ctrl+K or Cmd+K) to go to any page, open a client or an invoice, start a new
  invoice, draft a reminder or toggle the theme, and "?" for the list of shortcuts.
- A phone layout below 768 px (top bar with a menu, card lists instead of tables, the due line
  scrolling with its labels pinned, 44 px tap targets) and an installable app: a web manifest, icons
  and a theme colour. There is no service worker, so an installed copy still needs a connection.
- `GET /api/cron/daily`, `POST /api/demo/prepare`, `GET /api/queue`, `POST /api/queue/{id}/dismiss`,
  `GET /api/digest`, `GET /api/rate-alerts`, `GET`/`POST` `/api/repeats`, `PATCH`/`DELETE`
  `/api/repeats/{id}`, `GET`/`POST` `/api/items`, `DELETE /api/items/{id}` and
  `PUT /api/clients/by-key/{key}/language`. Migration 006 adds the queue, repeats, library and the
  client language; 007 lets queue items stay until acted on.

- Money views on Receivables: a forecast of what will arrive in the next 30, 60 and 90 days (weighted by
  each client's payment history, with the best case beside it), what getting paid costs this
  financial year, the invoices falling due in the next 14 days, the clients furthest behind, and
  today's rupee rates against their 30-day average.
- A Customise button on Receivables to show, hide and reorder these widgets, with Reset to default.
  The layout is kept in this browser only.
- A Clients page with a searchable table, and a page for each client with their invoices, risk,
  private notes and a "New invoice for this client" button.
- A page for each invoice with its history (created, sent, reminders, views, payment, cancellation),
  its items, SAC, purpose code and LUT, and the actions its status allows: send a reminder,
  duplicate, record a payment outside PayPal, and cancel. Cancelling does not email the client unless
  you tick the box. Receivables rows and the invoice panel link to it.
- `GET /api/dashboard`, `GET /api/clients`, `GET /api/clients/by-key/{key}`, `PUT /api/clients/by-key/{key}/notes`,
  `GET /api/invoices/{id}`, `POST /api/invoices/{id}/cancel` and
  `POST /api/invoices/{id}/record-payment`, and the `invalid_state` error. Migration 005 adds client
  notes.

### Changed

- A reminder card allows one PayPal reminder and one message from your own email per invoice per day, instead of one in all. After either, the other stays available, and the card closes for the day only when both have been used. PayPal's two-a-day limit still counts only PayPal reminders; the tone rules count both.
- Nudges no longer pretends PayPal sends the drafted words (PayPal ignores a subject and note on its reminder and send calls). Each card has "Send PayPal reminder" (PayPal's standard reminder with a Pay now button; PayPal writes the wording) and "Send my message", which opens the drafted subject and message in the freelancer's own email, in Gmail or on the clipboard, addressed to the client with the invoice's pay link at the end. "I sent it" records that message in the reminder history, Activity and the tone rules, and PayPal's daily limit counts only PayPal's reminders. Invoice sends no longer carry a subject or note either.
- A final-tone reminder reached only by being more than 30 days late no longer calls itself the final or last reminder, in any language; it asks for payment within 3 days or a date.
- Reminders read like a person wrote them: a greeting line, short paragraphs and a sign-off with the name and business name. A draft whose words contradict its tone is replaced by the template. The suggested tone is final only after two reminders or beyond 30 days, a late payer's first nudge is firm, and every suggestion says why.
- "Paid this month" is now "Paid in the last 30 days".
- Migration 008 adds `demo_generation`, `demo_hidden_invoices` and `bank_receipts`.
- Nudges opens at once. `GET /api/reminders` no longer waits for the model: each overdue invoice comes
  back with the draft the model wrote earlier, or the template marked `pending`. The screen asks for
  better drafts one card at a time and replaces the text only if it has not been edited. The draft
  cache key now includes the language.
- `Settings` gains `prepareReminders`, `remindAfterDays` and `rateAlerts`; `ReminderDraft` gains
  `language` and `pending`; `ClientDetail` gains `language`; `DashboardResponse` gains `rateAlerts`.
- Colours come from tokens in both themes. The AG Grid theme and the due line read them, and a test
  checks text contrast in both themes.
- Reminder drafts are cached under a new prompt version, because they no longer end in "Thank you".
- The LUT line on an invoice is now the declaration; invoices with the earlier line still count as
  under LUT.
- One rupee figure per payment. A paid invoice's rupees are PayPal's own figure when reported,
  otherwise PayPal's net at the ECB rate of the payment date less the markup, in Receivables, the
  invoice panel, the due line tooltip and the export register alike. The panel names the rate
  ("ECB rate of 30 Oct 2026"). `InvoiceSummary` gains `payoutSource` and `rateDate`.
- A payment recorded outside PayPal has no PayPal fee or markup: its rupees are its amount at the ECB
  rate of the payment date, tagged "outside PayPal", and the table and panel say "Paid outside
  PayPal". `Totals.paidThisMonthInr` is replaced by `paidThisMonthPayPalInr` and
  `paidThisMonthOutsideInr`; the "Paid this month" tile adds "plus ₹X recorded outside PayPal".
- The export register hides a rupee part that is zero, cites PayPal's monthly digital FIRA with a
  "Learn more" link, and puts the CA's columns first (purpose code shows the code, with its
  description in a tooltip).
- The receivables table fits a laptop: work, issue date and purpose code moved into the invoice panel
  (still searchable), and the activity feed sits beside the table only on very wide screens.
- Reminder tone follows the client's record: a late payer is chased one step firmer, and the card
  says why. Risk readings based on fewer than 4 invoices say so.
- Invoices belong to one client when the business name matches or, outside demo mode, the email does,
  so a client with a new email keeps their history.
- The purpose code is kept in the invoice's private memo instead of the reference field the client
  sees as "Reference no."; older invoices are still read.
- The activity feed dates the demo story by its own dates, and shows a date for anything a week old.
- The due line shows the last 60 days and the next 21 with "Show older", keeps the "Today" label and
  status text clear of other labels, says "Paid N days late" in the late colour, and uses 12 px text
  at least.
- Demo safety: reset leaves invoices created in the last 30 minutes alone and says how many; when
  PayPal's two reminders a day are used up Nudges says so and disables sending; the reset button
  moved from Fees and rates to a "Demo tools" page that appears in the sidebar in demo mode only.
- `GET /api/reminders` returns `remindersLeftToday`, and `POST /api/demo/reset` returns `kept`.

### Fixed

- Invoices paid through PayPal are shown in the demo whether or not they carry a Dueline marker, unless
  the owner hid them. The early sandbox invoices had no marker, so the real payments disappeared and
  "What getting paid costs" said none came through PayPal. A payment recorded outside PayPal still
  needs a marker.
- After a demo reset, Nudges "Today" and the Receivables "This morning" card no longer list invoices
  that were cancelled, paid or are no longer overdue. A queued reminder is checked against the shown
  invoices whenever the queue is read and deleted when it no longer applies, the reset and the weekly
  re-seed clear the queued reminders, and the morning card is worked out from the shown invoices each
  time instead of being stored.
- Averages of days are written in whole days wherever text shows them ("12 days on average", not
  "11.7"). The exact value stays in the data.
- The sidebar scrolls inside itself on a short screen. Before, "Lock demo" could run below the dark
  panel onto the light page, where its text could not be read.
- Each row of the due line now has an accessible name that starts with the words shown on the row
  (client, amount and status), then the date, so voice control and screen readers match the label.
- The new invoice review screen no longer builds its purpose code list and client reading anew on
  every render.

### Added

- A business profile (`/profile`, "Profile" in the sidebar): your name, business name, GSTIN, LUT
  ARN and end date, default SAC, website and reminder sign-off, with a preview of the invoice
  header. `GET` and `PUT /api/profile`, migration 004.
- Invoices carry the profile: the business name replaces PayPal's sandbox name, with your name,
  GSTIN and website; items show `SAC <code>`; "Export under LUT (no IGST)" writes the declaration,
  the LUT ARN and the place of supply. The review screen warns when the ARN is missing or the LUT
  has ended, and when your name or business name is empty. `LineItem` gains `sac`.
- Reminders end with your sign-off and name; none is invented when the name is empty.
- Export register: a SAC column, and your GSTIN in a comment line above the headers.
- GSTR-1 export (`GET /api/exports/gstr1`): the export-of-services rows for invoices issued in a
  month, in rupees at the ECB rate of the invoice date. Estimate; confirm with your CA.
- Year summary (`GET /api/exports/annual`, JSON or CSV): receipts through PayPal and outside it,
  PayPal fees and conversion loss, section 44ADA income and its limit, for a financial year. Estimate;
  confirm with your CA.
- The demo seeds a profile for Riya Sharma only when none is saved.
- A rich, repeatable demo story. `npm run seed` now builds eight sandbox invoices for five clients,
  with older invoices recorded as paid outside PayPal, so the late-payer radar shows Reliable
  (Halden Coffee Co.), Watch (Brightwell Labs) and Late payer (Okafor & Reyes) for real reasons.
  `POST /api/demo/reset` is built and no longer a stub: in demo mode it cancels open invoices outside
  the story, deletes drafts and restores the story, once every ten minutes. Settings has a "Demo"
  card with a "Reset the demo" button. The response changes from `204` to the counts of what changed.
- The export register lists invoices recorded as paid outside PayPal after the table, with their
  numbers, and leaves them out of the rupee totals, because they are not on PayPal's FIRA.
- A landing page that explains Dueline on one screen and leads into the demo.

- The late-payer radar. Dueline scores each client from their paid and overdue invoices, by name and
  email together, as reliable, on watch or a late payer, with a one-sentence reason worked out from
  the numbers. For a client on watch or a late payer the new invoice screen offers a 1% or 2%
  early-payment discount in one click, and re-checks when the client's name or email is edited. The
  receivables table tags clients on watch and late payers, and the invoice panel shows the reason.
  `GET /api/clients/risk` is built and no longer a stub, `POST /api/invoices/extract` now returns
  the draft client's risk, and every invoice carries a `riskLevel`.
- Nudges. For every overdue invoice Dueline drafts a polite reminder in a suggested tone (gentle,
  firm or final). You switch tone (if you have edited the text, the card asks "Replace your edits with a Firm draft?"
  first), edit the text and click "Send reminder through PayPal"; PayPal
  emails the client from your account with the invoice and its Pay now button. Drafts are written by
  Gemini and checked in code (length, invoice number, amounts, no links or email addresses; a client called "Acme.io" is not taken for a link), with a
  template when AI is unavailable or the check fails. `GET /api/reminders`,
  `POST /api/reminders/draft` and `POST /api/reminders/send` are built and no longer stubs. Dueline
  sends one reminder per invoice a day, PayPal allows two a day for the account, and drafting is
  limited to 20 an hour per address.
- The export register: for any month, the invoices paid in it (India time) with the foreign amount,
  PayPal's fee and net, the rupees received, the purpose code, whether the invoice was under LUT and
  PayPal's transaction ID (from the invoice's own latest payment when PayPal reported no payout
  figures), to match line by line with PayPal's monthly FIRA. `GET /api/export-register`
  is built and no longer a stub, and "Download CSV for your CA" gives the accountant a spreadsheet-safe
  file. Rupees are PayPal's figures when reported, otherwise an estimate at the ECB rate of the payment
  date, and each row says which.
- A payout records when it was paid (`paidAt`) and PayPal's transaction ID. Payouts stored earlier are
  read from PayPal once more to gain them.
- ECB rates for a past date, fetched once per date.

- The receivables screen: totals in rupees, the due line for every invoice, a sortable and
  searchable invoice table, an invoice panel that sets the estimate against PayPal's own figures
  for a paid invoice, and a live activity feed. It refreshes every 10 seconds while the tab is open, and re-checks today's date every 5 minutes.
  The table starts with the most overdue invoices and ends with the paid ones.
  An invoice due today reads "Due today" in the table, the panel and the due line, and every unpaid
  line on the due line is at least 8 px long.

### Changed

- Receivables labels rupees "PayPal" only when PayPal reported them; rupees worked out from
  PayPal's net at the ECB rate are labelled as an estimate.
- A paid invoice's paid date, days late and "paid this month" use the India date of the payment's
  timestamp, not PayPal's `payment_date`, which is in PayPal's time zone. A payment at 01:06 IST on
  30 Oct is now paid on 30 Oct.
- The AI draft names the business being billed as the client and writes item names as invoice lines.
  Stored answers written under the old prompt are no longer reused.
- A delivery date in a chat is no longer taken as the payment due date: with no payment terms the due date is 14 days from today, with a warning. The discount note now names the same date as the due date.
- A discount is limited to 1 to 20 percent over 3 to 30 days, and a due date in the past is refused.
- The store can release a request that is still in progress.
- The purpose-code list uses the RBI's official labels and adds P1015 and P1017 (checked on 30 Oct
  2026).
- `engines.node` is `24.x`, so Vercel no longer moves the project to a newer Node.js major version by
  itself.
- Hosting moves from Render to Vercel (functions in Singapore next to the database).
- Settings have one fixed fee per currency (`fixedFees`) instead of one `fixedFee`, and the default
  conversion markup is 3.0%.
- `GET /api/invoices` reads every listed invoice in full, so the work description and the payer link
  are filled in. Full invoices are cached for 10 minutes and the finished list for 20 seconds.
- An unexpected server error is answered with 500 `internal_error`.
- A paid invoice's date is now read from a plain date or a timestamp and converted to Asia/Kolkata.

### Fixed

- PayPal invoicing webhooks are read from resource.invoice, as PayPal sends them.

### Added

- New invoice screen: paste a client chat (or start blank), review and correct the draft, see what
  reaches your bank in rupees, and click "Create and send invoice". A sample chat and a "Send to the
  demo buyer" button are included. If a held request is edited and sent again, the screen explains
  that the details changed and offers "Create another".
- `POST /api/invoices` creates the PayPal draft and sends it, and `POST /api/invoices/{id}/send`
  retries sending a draft. A repeated request returns the stored result, so a double click or a
  timeout never creates a second invoice. A send that fails answers "Draft created, not sent". A
  request left in progress for more than two minutes is resolved by finding the invoice again from
  its memo.
- An early-payment discount through PayPal's own invoice discount, with the due date moved to the
  earlier of the chosen date and the end of the discount window.
- `GET /api/purpose-codes` returns the real list, and `GET /api/demo/recipient` returns the sandbox
  buyer's address in demo mode.
- In demo mode, sending an existing draft is refused unless it is addressed to a sandbox buyer.
- `paypal_timeout` (504) in the API contract, and decision record 0011.
- Setup steps for turning off automatic reminders in the sandbox business account.
- Invoice drafting from a pasted chat: `POST /api/invoices/extract` hides emails and phone numbers,
  asks Gemini for a draft, checks every field in code and returns warnings for anything it could not
  confirm. Limits of 10 extractions an hour per address and 400 model calls a day, a fallback model,
  and a 24-hour cache for identical chats. `risk` stays `null` until the late-payer radar is built.
- A draft item is flagged when its price does not appear as a number in the words quoted from the
  chat.
- A chat with phrases that look like instructions to the AI gets a warning to check every item.
- `npm run ai:check` and `npm run extract:check`, and migration `003_cache_entries.sql`.
- Decision record 0010 on AI invoice drafting.
- Demo password: a shared password with a signed cookie protects the app screens and every API
  route except `GET /api/health`, `POST /api/webhooks/paypal` and `/api/demo/session`. Includes the
  `/demo` sign-in screen, a "Lock demo" button, `POST` and `DELETE /api/demo/session`, a limit of
  10 attempts in 15 minutes and `SESSION_SECRET`. In production both settings are required.
- PayPal webhooks: signatures are verified with PayPal, each event is processed once, and a paid or
  sent invoice event re-reads the invoice, stores the payout and records activity.
  `GET /api/activity` now returns the latest 20 stored events.
- `invalid_webhook` (400) in the API contract.
- `render.yaml` Blueprint for Render's free plan, a "Deploying" section in CONTRIBUTING.md and
  decision record 0008.
- Payout estimate from PayPal India's published fees and the ECB's daily rate, with the date and
  source of the rate, and `POST /api/payout-estimate` now calculates instead of returning sample
  data.
- Daily ECB rates through Frankfurter, fetched once a day and stored, with the latest stored rates
  and then manual rates as fallbacks, and `npm run rates:check`.
- `GET` and `PUT /api/settings` now store real settings: a fee percentage, a fixed fee for each
  currency, the conversion markup, the rate source and manual rates.
- "Fees and rates" screen with a settings form and a "What reaches your bank" calculator.
- `payoutInr` and the rupee totals now come from PayPal's figures where they exist and from the
  estimate otherwise.
- `internal_error` (500) in the API contract.
- Security headers on every response, and no `X-Powered-By` header.
- Decision record 0007 on fees and rates.
- Validated environment settings that refuse to start unless `PAYPAL_ENVIRONMENT=sandbox`.
- A date module for Asia/Kolkata with the demo clock, day arithmetic and tests.
- PayPal sandbox client: cached OAuth token, REST client for Invoicing v2 with a timeout and one
  retry on 401, Server SDK wrappers, and mapping from PayPal invoices to `InvoiceSummary`.
- Actual payout lookup from the PayPal capture, with Transaction Search as a fallback.
- Postgres store (Neon) with an in-memory fallback, and SQL migrations run by `npm run db:migrate`.
- `GET /api/health` and `GET /api/invoices` now read real data instead of sample data.
- Rupee totals for the receivables page.
- `npm run sandbox:check` and `npm run seed` scripts for the PayPal sandbox.
- Decision record 0006 on storage.
- `config_error` (500) in the API contract.
- Next.js 16 app with Tailwind CSS 4, shadcn/ui and the Dueline design tokens.
- App shell with sidebar navigation, a PayPal connection status line and five placeholder pages.
- Placeholder landing page and a not-found page.
- Shared types and Zod request schemas matching the API contract.
- Fixed list of RBI purpose codes.
- Sample data and stub API routes for every endpoint in the API contract.
- Typed API client, the only way screens reach the server.
- Unit tests for fixtures, schemas, stub routes and the API client.
- Prettier, ESLint, Vitest and TypeScript scripts.
- GitHub Actions CI, CodeQL analysis and Dependabot configuration.
- README, contributing guide, code of conduct, security policy, architecture overview and
  decision records.
