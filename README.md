# SplitFlow — Smart, Minimalist Expense Splitting

SplitFlow is a premium, modern, glassmorphic Splitwise alternative built with **React**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Supabase**. It utilizes **Zustand** for lightweight client-side state management, **TanStack React Query** for robust server-side caching/synchronization, and **Framer Motion** for elegant animations.

---

## 🚀 Key Features

1. **Elegant Glassmorphism UI**: High-fidelity Apple-inspired design language with frosted-glass cards, responsive spacing, and dark/light modes.
2. **Postgres-Driven Unique SplitID**: Generate a unique public identifier `SPL-XXXXXX` on signup to allow secure group invites.
3. **Advanced Expense Splitting**:
   * **Equally**: Split evenly across all selected members.
   * **Percentage**: Allocate custom percentages (must sum to exactly 100%).
   * **Exact Amount**: Allocate specific dollars (must sum to exactly the total expense).
4. **Automated Group Activity Ledger**: A group action log tracking expenses added, updated, deleted, members joining, or debts settled.
5. **Direct Settlements**: Mark suggested balances as settled directly. View a clean historical ledger of group settlements.
6. **Supabase Storage Receipts**: Securely upload and link JPG, PNG, and PDF receipts to expenses.
7. **Bulletproof Security (RLS)**: Row Level Security policies active on all tables preventing unauthorized data leaks.

---

## 📁 Folder Structure

```
splitflow/
├── public/                  # Static assets
├── supabase/
│   ├── schema.sql           # Full SQL setup script
│   └── migration_01.sql     # Incremental upgrade script
├── src/
│   ├── assets/              # App images
│   ├── components/
│   │   ├── auth/            # Login, Signup, Reset Password
│   │   ├── dashboard/       # ActiveGroups, BalanceCards, ActivityFeed
│   │   ├── layout/          # Header, Bottom Navbar
│   │   ├── modals/          # Complex ExpenseModal (Equal/Percentage/Exact)
│   │   └── ui/              # Toast Alerts
│   ├── context/
│   │   └── AuthContext.tsx  # Supabase Auth Provider wrapper
│   ├── hooks/
│   │   ├── useAppStore.ts   # Zustand Store (routing, modals, alerts)
│   │   └── useQueries.ts    # React Query hooks (caching, invalidations)
│   ├── lib/
│   │   └── supabaseClient.ts# Client initialization
│   ├── pages/
│   │   ├── DashboardPage.tsx# Net balance overview, activity log
│   │   ├── GroupsListPage.tsx# List of user's groups, join-by-code panel
│   │   ├── CreateGroupPage.tsx# Name/type configurations, member invites
│   │   ├── GroupDetailsPage.tsx# Expenses, Settlements, Members tab details
│   │   └── ProfilePage.tsx  # Copy SplitID, edit name, sign out
│   ├── services/
│   │   ├── api.ts           # Fetching, inserting, deleting, search functions
│   │   └── storage.ts       # Supabase Storage receipt uploads
│   ├── types/
│   │   └── index.ts         # TypeScript interface definitions
│   ├── utils/
│   │   └── expense.ts       # Greedy simplification debt arithmetic
│   ├── index.css            # Base Tailwind and glassmorphism definitions
│   └── main.tsx             # React Query wrapper node setup
├── package.json             # Core dependency management
├── tailwind.config.js       # Styling theme customization
└── vite.config.ts           # Vite plugin settings
```

---

## 🗄️ Database & SQL Schemas

SplitFlow requires the following relational database tables inside Supabase:
* `profiles`: User profiles linked to `auth.users` with unique `expense_id` (`SPL-XXXXXX`).
* `groups`: Group records representing trip or household contexts.
* `group_members`: Unique membership relationships mapping profiles to groups.
* `expenses`: Ledger items including amount, notes, paid_by, and split type details.
* `expense_splits`: Precise split values per participant mapped to expenses.
* `settlements`: Direct debt settlement transactions.
* `activities`: Dynamically written feed actions.

### 🛡️ Row Level Security (RLS) Rules
* Users can only select or update their own profile information.
* Users can only see groups they belong to.
* Users can only view or record expenses, splits, settlements, and activities inside groups they belong to.

### ⚡ Automatic Logging (Postgres Triggers)
All actions are logged securely at the database layer. Postgres triggers automatically record changes to `expenses`, `group_members`, and `settlements` to the `activities` log table:
* Logging is immediate and guarantees audit integrity.
* Minimizes API request duplication on the client.

---

## ⚙️ Local Setup Instructions

1. **Clone & Open Directory**:
   Set `C:/Users/Harsh/.gemini/antigravity/scratch/splitid` as your active workspace.

2. **Supabase Environment Variables**:
   Create a `.env.local` file in the root directory and define the following variables:
   ```env
   VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_publishable_anon_key
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Run Database Migrations**:
   Copy the contents of `supabase/schema.sql` and run them in the **SQL Editor** of your Supabase Dashboard to instantiate all tables, triggers, and security rules.

5. **Start Dev Server**:
   ```bash
   npm run dev
   ```

6. **Build for Production**:
   ```bash
   npm run build
   ```

---

## 🚀 Deployment Instructions

### Frontend (e.g. Vercel or Netlify)
1. Link your GitHub repository.
2. Configure build settings:
   * Build Command: `npm run build`
   * Output Directory: `dist`
3. Add Environment Variables:
   * `VITE_SUPABASE_URL`
   * `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy**.

### Storage Bucket Setup
1. In your Supabase Dashboard, go to **Storage**.
2. Create a new public bucket named **`receipts`**.
3. Enable RLS on the bucket and add a Policy allowing authenticated users to upload, read, and delete files inside folders matching the group IDs they belong to.
