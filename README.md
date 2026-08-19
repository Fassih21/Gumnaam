# Gumnaam — UOL Underground

An anonymous discussion feed for University of Lahore students. Sign-up requires a
verified `@student.uol.edu.pk` email, but every post and comment is shown under a
generated anonymous handle (`Anon#XXXX`) — never a real name.

## Features

- **Verified-only access** — accounts are gated to `@student.uol.edu.pk` emails,
  enforced both client-side and with a DB-level check constraint.
- **Anonymous by default** — real name and email are stored but never exposed
  through the API; even authenticated users can only read each other's anon
  handle, not their identity.
- **Posts, comments & reactions** — upvote/downvote on posts and comments, one
  reaction per user per target.
- **Trust network** — users can mark others as trusted (not shown publicly).
- **Keyword moderation** — posts/comments are checked against an admin-managed
  blocked-keyword list before they're allowed to save.
- **Admin dashboard** — moderator-only route for identity lookups, reports, and
  removals (in progress — see Roadmap).
- **Realtime feed** — new posts, comments, and reactions stream in without a
  page refresh.

## Tech stack

- [TanStack Start](https://tanstack.com/start) (React 19, file-based routing via
  TanStack Router)
- TypeScript
- Tailwind CSS + shadcn/ui components
- [Supabase](https://supabase.com) — Postgres, Auth, Row Level Security, Realtime
- Vite


## Prerequisites

- [Bun](https://bun.sh) (this project uses `bun.lock`, not npm/yarn)
- A Supabase project (free tier is fine)

## Getting started

```sh
git clone https://github.com/Fassih21/Gumnaam.git
cd gumnaam
bun install
```

### Environment variables

Copy the example file and fill in your own Supabase project's values:

```sh
cp .env.example .env
```

| Variable                        | Where to find it                                  |
| -------------------------------- | -------------------------------------------------- |
| `SUPABASE_URL`                   | Supabase dashboard → Project Settings → API         |
| `SUPABASE_PUBLISHABLE_KEY`       | Supabase dashboard → Project Settings → API         |
| `SUPABASE_PROJECT_ID`            | Supabase dashboard → Project Settings → General     |
| `VITE_SUPABASE_URL`              | same as `SUPABASE_URL`                              |
| `VITE_SUPABASE_PUBLISHABLE_KEY`  | same as `SUPABASE_PUBLISHABLE_KEY`                  |
| `VITE_SUPABASE_PROJECT_ID`       | same as `SUPABASE_PROJECT_ID`                       |

`SUPABASE_SERVICE_ROLE_KEY` is required for any server-side admin operations
(`src/integrations/supabase/client.server.ts`) but is **not** included in
`.env.example` — get it from the same API settings page and never commit it.
This key bypasses Row Level Security entirely.

`.env` is git-ignored. Never commit real keys — see [Security](#security) below.

### Database setup

Migrations live in `supabase/migrations/`. Apply them to your Supabase project
with the [Supabase CLI](https://supabase.com/docs/guides/cli):

```sh
supabase link --project-ref <your-project-id>
supabase db push
```

### Run locally

```sh
bun run dev
```

Other scripts:

```sh
bun run build     # production build
bun run preview   # preview a production build
bun run lint       # eslint
bun run format     # prettier --write
```

## Project structure

```
src/
  routes/                    # file-based routes (TanStack Router)
    _authenticated/          # routes gated behind a logged-in session
      admin.tsx               # moderator dashboard
    signup.tsx / login.tsx
    index.tsx                 # campus feed
    post.$id.tsx
  integrations/supabase/
    client.ts                 # browser client (anon/publishable key)
    client.server.ts          # server-only client (service role, bypasses RLS)
    auth-middleware.ts        # verifies Bearer token on server functions
    auth-attacher.ts          # attaches session token to outgoing server fn calls
  hooks/useAuth.tsx           # session + profile state
  lib/uol.ts                  # university email validation
supabase/migrations/          # SQL schema, RLS policies, triggers
```

## Security

- **Row Level Security** is enabled on every table. Users can only read/write
  their own rows unless a policy explicitly allows more (e.g. admins).
- **Column-level privacy**: `name` and `uol_email` are never exposed through
  direct table grants — only through `my_identity()` (self) and
  `admin_identity()` (admin-only) functions.
- **Keyword moderation** runs as a `BEFORE INSERT/UPDATE` trigger on `posts`
  and `comments`, not just client-side, so it can't be bypassed by calling the
  API directly.
- The **service role key** bypasses RLS entirely — it is only ever used in
  `client.server.ts`, on the server, and must never reach client-side code or
  be committed to the repo.
- If `.env` is ever accidentally committed and pushed, rotate every key in it
  immediately from the Supabase dashboard, even after removing it from history.

## Roadmap

- Admin dashboard: blocked keyword management, report review, identity lookup,
  soft-delete UI (currently placeholder cards)
- Reports/flagging flow for posts and comments

## License

Private project — not currently licensed for reuse.
