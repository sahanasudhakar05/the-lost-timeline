# The Lost Timeline — Round 2

## What's included
- `index.html`: participant website (one HTML file with CSS and JavaScript included)
- `supabase/functions/submit-round2/index.ts`: server-side submission endpoint
- `supabase/config.toml`: config for the public submission endpoint
- `sample_round2.csv`: sample CSV format (illustrative records only)

## Important security design
- There is no CSV export button in the participant website.
- The HTML contains only the Supabase project reference and publishable/anon key. These are intended for browser use.
- The Supabase secret/service-role key is used only by the Edge Function, never by the browser.
- The endpoint accepts POST only and checks basic field validation.
- The database's unique constraint allows one submission per `team_id` and `round_id`.
- Export the CSV while signed into the Supabase Dashboard. Do not add a public download endpoint.

## Step 1 — Fill in the browser-safe values
Open `index.html` in VS Code. Find these two lines near the beginning of the script:
```js
const SUPABASE_PROJECT_REF = "PASTE_YOUR_PROJECT_REF_HERE";
const SUPABASE_PUBLISHABLE_KEY = "PASTE_YOUR_PUBLISHABLE_OR_ANON_KEY_HERE";
```
Project reference is the subdomain in your project URL:
`https://YOUR_PROJECT_REF.supabase.co`
In Supabase Dashboard, open Project Settings → API Keys. Copy the **publishable key** (preferred) or legacy **anon key**. Do NOT copy a secret key or service_role key.

## Step 2 — Deploy the Edge Function using the dashboard
1. Open your Supabase project.
2. Go to Edge Functions and create a new function named `submit-round2`.
3. Open the function's editor and replace its contents with the full code from `supabase/functions/submit-round2/index.ts`.
4. Deploy the function.
5. If the dashboard provides a JWT verification setting for the function, turn verification off for this public endpoint (the function itself accepts only POST and validates fields). The included `config.toml` also documents `verify_jwt = false` for CLI deployments.
6. Confirm the function is deployed and the function name is exactly `submit-round2`.

## Step 3 — Confirm database setup
The table should be `public.round_submissions` with:
- `team_id` text
- `team_name` text
- `round_id` text
- `responses` jsonb
- `completion_time` integer
- `submitted_at` timestamptz

The unique constraint should be on `(team_id, round_id)`. Keep Row Level Security enabled. The participant website never reads the table.

## Step 4 — Test locally
1. Open the project folder in VS Code.
2. Open `index.html` with the VS Code Live Server extension, or double-click it in your browser.
3. Use a test Team ID such as `TEST-001` and a test Team Name.
4. Complete the round and click **Submit final results**.
5. In Supabase → Table Editor → `round_submissions`, check that the test row appears.
6. Try submitting the same Team ID again. The second submission should be rejected by the database uniqueness constraint.

## Step 5 — Export CSV as organiser
1. Sign into the Supabase Dashboard yourself.
2. Open Table Editor → `round_submissions`.
3. Filter `round_id` to `R2` if needed.
4. Use the table's export/download CSV option.
Only organisers with dashboard access should do this. Never create a public CSV download endpoint or put a secret key in the HTML.

## Before event day
- Test from two different devices/networks.
- Check the row appears in Supabase, not merely in the browser.
- Test duplicate Team IDs.
- Verify participants cannot access the Supabase dashboard.
- Remove test submissions before the real event, or use a clear test prefix and delete those rows.
- The endpoint is public and basic validation is not a full anti-abuse system. For a high-stakes event, add stronger controls (e.g. an event access code checked server-side, rate limiting, and organiser authentication for administrative actions).
