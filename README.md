# Personal Expense Tracker

A fast, minimal, production-quality personal expense tracker web application. Record daily expenses in seconds with just three fields: **Date**, **Details**, and **Price**.

## Features

- **Lightning-fast entry** — Add an expense in under 10 seconds
- **Three fields only** — Date, Details (free-form text), Price
- **Monthly view** — Navigate between months with automatic totals
- **Search** — Find expenses by details text
- **Full CRUD** — Create, read, edit, and delete expenses
- **Indian currency** — Proper ₹ formatting with Indian number grouping (₹1,25,000)
- **Cloud storage** — Persistent data via Supabase (PostgreSQL)
- **Responsive** — Works on desktop, tablet, and mobile
- **Dark theme** — Clean, modern productivity-tool aesthetic
- **No build step** — Pure HTML, CSS, and vanilla JavaScript

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, Vanilla CSS, Vanilla JavaScript (ES Modules) |
| Database | Supabase (PostgreSQL) |
| Fonts | Google Fonts (Inter) |
| Hosting | Any static file host (Netlify, Vercel, GitHub Pages, etc.) |

## Local Setup

### Prerequisites

- A [Supabase](https://supabase.com) account and project
- Any local HTTP server (the project includes a PowerShell dev server)

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd expense-tracker
```

### 2. Set Up Supabase

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Go to **Authentication → Providers** and ensure Email provider is enabled.
3. Go to **Authentication → Users** and click **Add User** to create your login credentials.
4. Go to **SQL Editor** and run the contents of `database/schema.sql` (or `database/migration_01_add_auth.sql` if upgrading an existing setup).
5. Go to **Settings → API** and copy your:
   - **Project URL** (e.g., `https://xxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

### 3. Configure Credentials

Edit `src/lib/supabase.js` and replace the placeholder values:

```js
const SUPABASE_URL = 'your-project-url';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

### 4. Run Locally

**Option A: PowerShell (included)**
```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
# Opens at http://localhost:3000
```

**Option B: Python**
```bash
python -m http.server 3000
```

**Option C: Node.js**
```bash
npx -y serve .
```

Open `http://localhost:3000` in your browser.

## Environment Variables

| Variable | Description |
|----------|------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public API key |

> **Note:** Since this project has no build step, credentials are configured directly in `src/lib/supabase.js`. The `.env` file serves as documentation. Never commit real credentials to Git.

## Database Schema

The application uses a single `expenses` table:

```sql
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  details TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL CHECK (price > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- `idx_expenses_date` — Fast monthly filtering (date DESC)

**Security:**
- Row Level Security (RLS) enabled
- Public access policy for personal use (add authentication before public deployment)

Full schema: [`database/schema.sql`](database/schema.sql)

## Project Structure

```
├── index.html              # Main HTML (semantic structure, modals)
├── database/
│   └── schema.sql          # PostgreSQL schema for Supabase
├── src/
│   ├── app.js              # Application controller (state, events, rendering)
│   ├── lib/
│   │   ├── supabase.js     # Supabase client initialization
│   │   ├── database.js     # CRUD operations (Supabase + localStorage fallback)
│   │   ├── formatters.js   # Currency, date, month formatting
│   │   └── validators.js   # Input validation
│   └── styles/
│       ├── variables.css   # Design tokens (colors, spacing, typography)
│       ├── reset.css       # CSS reset
│       ├── global.css      # Body, scrollbar, focus styles
│       └── components.css  # All component styles + responsive breakpoints
├── serve.ps1               # PowerShell dev server
├── .env.example            # Environment variable template
├── .gitignore
└── README.md
```

## Deployment

This is a static site — deploy to any static hosting:

**Netlify / Vercel:**
1. Connect your Git repository
2. Set build command to empty (no build needed)
3. Set publish directory to `.` (root)
4. Deploy

**GitHub Pages:**
1. Push to a `gh-pages` branch or enable Pages from `main`
2. The site serves directly from root

## Troubleshooting

| Issue | Solution |
|-------|---------|
| "Failed to load expenses" | Check Supabase URL and anon key in `src/lib/supabase.js` |
| Table not found error | Run `database/schema.sql` in Supabase SQL Editor |
| Data not persisting after refresh | Verify Supabase connection; if using localStorage fallback, data is browser-local only |
| Mobile keyboard not showing numeric | Ensure `inputmode="numeric"` is set on price input |

## License

MIT
