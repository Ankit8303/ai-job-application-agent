# ai-job-application-agent

**JobBuddy AI** — Autonomous AI Job Application Agent powered by Next.js 16, Supabase Auth & PostgreSQL, and Tailwind CSS.

## Features

- **Authentication**: Email/Password and Google OAuth with session refreshing via `@supabase/ssr`.
- **Database**: PostgreSQL with Row Level Security (RLS) policies for user profiles and job applications.
- **Collapsible Dashboard**: Icon-only collapsed state and full expanded state, real-time AI credits tracker, and modular sub-pages.
- **Protected Routing**: Middleware-enforced route protection for `/dashboard`.

## Getting Started

1. Clone repository:
   ```bash
   git clone https://github.com/Ankit8303/ai-job-application-agent.git
   cd ai-job-application-agent
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup environment variables:
   Copy `.env.example` to `.env.local` and configure your Supabase URL and anon key.

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.
