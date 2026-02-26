# LoomMVP — Screen Recording Made Simple

A Loom-like screen recording application built with Next.js 14, Supabase, and Cloudflare R2.

## Features

- Record screen, webcam, or both simultaneously
- Upload recordings directly to Cloudflare R2
- Share recordings via a public link
- Dashboard to manage your recordings
- Edit video titles, delete recordings
- View count tracking

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Auth & Database**: Supabase (email/password auth + PostgreSQL)
- **Storage**: Cloudflare R2 (S3-compatible)

---

## Setup Guide

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New Project** and fill in the details
3. Wait for the project to be created (~2 minutes)
4. Go to **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**keep this secret!**)

### 2. Run the Database Migration

1. In your Supabase project, go to **SQL Editor**
2. Click **New Query**
3. Copy the contents of `supabase/migration.sql` and paste it in
4. Click **Run** (or press Ctrl+Enter)

You should see a `videos` table created in your **Table Editor**.

### 3. Create a Cloudflare R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2 Object Storage**
2. Click **Create bucket**, name it `loom-videos`
3. Go to **R2 → Manage R2 API Tokens** → **Create API Token**
   - Give it **Object Read & Write** permissions
   - Copy:
     - `Access Key ID` → `R2_ACCESS_KEY_ID`
     - `Secret Access Key` → `R2_SECRET_ACCESS_KEY`
4. Your R2 endpoint will be: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
   - Copy it → `R2_ENDPOINT`

### 4. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_BUCKET_NAME=loom-videos
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables Explained

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (public, safe to expose) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (public, used in browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key — **NEVER expose this client-side** |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 API access key ID |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 API secret — **keep secret** |
| `R2_ENDPOINT` | Your R2 endpoint URL (e.g., `https://abc123.r2.cloudflarestorage.com`) |
| `R2_BUCKET_NAME` | The R2 bucket name (default: `loom-videos`) |
| `NEXT_PUBLIC_APP_URL` | Your app's public URL (used for generating share links) |

---

## Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. Add all environment variables from `.env.local` in the Vercel dashboard
4. Change `NEXT_PUBLIC_APP_URL` to your Vercel deployment URL
5. Click **Deploy**

> **Important**: After deploying, update `NEXT_PUBLIC_APP_URL` to your production URL (e.g., `https://your-app.vercel.app`) and redeploy.

---

## Project Structure

```
src/
  app/
    page.tsx          # Landing page
    layout.tsx        # Root layout with Navbar
    record/           # Recording page (protected)
    dashboard/        # User dashboard (protected)
    watch/[id]/       # Public video watch page
    api/
      auth/           # Login, signup, logout
      upload/         # Video upload endpoint
      media/          # R2 media proxy (supports video seeking)
      videos/         # CRUD for videos
  components/
    Navbar.tsx        # Top navigation
    AuthForm.tsx      # Login/signup modal
    Recorder.tsx      # Recording UI
    VideoCard.tsx     # Video thumbnail card
    VideoPlayer.tsx   # HTML5 video player
    UploadProgress.tsx # Upload progress overlay
  hooks/
    useRecorder.ts    # Recording state management
  lib/
    supabase/         # Supabase client setup
    r2.ts             # Cloudflare R2 client
    utils.ts          # Helper functions
```

## Common Issues

**"Unauthorized" error when uploading**: Make sure you're logged in. The upload endpoint requires authentication.

**Video won't play after upload**: Check that your `R2_ENDPOINT` and bucket name are correct. The media proxy route (`/api/media/...`) fetches files from R2.

**Supabase auth not working**: Make sure you've confirmed your email (Supabase sends a confirmation email by default). You can disable email confirmation in Supabase Dashboard → Authentication → Providers → Email → turn off "Confirm email".
