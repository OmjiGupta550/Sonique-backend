# Sonique - Modern Music Streaming Web Application

Sonique is a premium, modern full-stack music streaming web application inspired by SimpMusic. It is built using Next.js 15, TypeScript, Tailwind CSS, Zustand, Supabase, and Framer Motion. 

Sonique queries the free, decentralized **Audius API** for its extensive music catalog and tracks, and uses the **LRCLIB API** for real-time synchronized scrolling lyrics.

---

## Technical Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4 (Glassmorphic dark design system)
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Database & Auth**: Supabase
- **Offline / PWA**: Native Service Worker caching audio streams and pages

---

## Features
1. **Glassmorphic UI**: harmonic dark palettes, canvas-based shifting backgrounds extracted from album covers.
2. **Audio Controls**: Play/Pause, Skip Next/Prev, Shuffle, Repeat (none, one, all), volume scrubbing, mini player, and expanded fullscreen overlay.
3. **Synchronized Lyrics**: auto-scrolling highlight lyrics synced with playhead, supporting interactive "click-to-seek".
4. **Library Management**: saved likes list, user play histories, created custom playlists, and offline tracks downloads list.
5. **Shortcuts & Timer**: sleep timer configurations and complete keyboard shortcuts for media play controls.
6. **Supabase Sync**: user profiles, preferences, likes and custom playlists fully synced to database tables.

---

## Local Setup Instructions

### 1. Prerequisites
- Node.js v18.x or later installed.
- A Supabase account (cloud or local development).

### 2. Set Up Environment Variables
Create a file named `.env.local` in the root of the project directory and fill in your Supabase project credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-api-key
```

### 3. Initialize the Database Schema
Open the **SQL Editor** in your Supabase Dashboard and execute the following SQL script to set up your tables, row level security policies, and user trigger creation:

```sql
-- Profiles Table extending Supabase auth.users
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;
create policy "Allow public read profiles" on public.profiles for select using (true);
create policy "Allow individual update profiles" on public.profiles for update using (auth.uid() = id);

-- Playlists Table
create table public.playlists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  cover_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.playlists enable row level security;
create policy "Allow read playlists" on public.playlists for select using (true);
create policy "Allow individual write playlists" on public.playlists for all using (auth.uid() = user_id);

-- Playlist Tracks Table
create table public.playlist_tracks (
  id uuid default gen_random_uuid() primary key,
  playlist_id uuid references public.playlists(id) on delete cascade not null,
  track_id text not null,
  title text not null,
  artist text not null,
  cover_url text,
  duration integer not null,
  source_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.playlist_tracks enable row level security;
create policy "Allow read playlist tracks" on public.playlist_tracks for select using (true);
create policy "Allow write playlist tracks" on public.playlist_tracks for all using (
  exists (
    select 1 from public.playlists 
    where playlists.id = playlist_tracks.playlist_id 
    and playlists.user_id = auth.uid()
  )
);

-- Liked Songs Table
create table public.likes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  track_id text not null,
  title text not null,
  artist text not null,
  cover_url text,
  duration integer not null,
  source_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, track_id)
);

alter table public.likes enable row level security;
create policy "Allow individual likes management" on public.likes for all using (auth.uid() = user_id);

-- Playback History Table
create table public.history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  track_id text not null,
  title text not null,
  artist text not null,
  cover_url text,
  duration integer not null,
  played_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.history enable row level security;
create policy "Allow individual history management" on public.history for all using (auth.uid() = user_id);

-- Preferences Table
create table public.preferences (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  theme text default 'dark' not null,
  volume_default float default 0.8 not null,
  accent_color text default '#8B5CF6' not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.preferences enable row level security;
create policy "Allow individual preferences management" on public.preferences for all using (auth.uid() = user_id);

-- Setup trigger on auth.users create for profiles & preferences automatic entry
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );
  insert into public.preferences (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### 4. Install Dependencies
Run the following command inside the project directory:
```bash
npm install
```

### 5. Run the Local Development Server
Launch the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to start listening.

---

## Production Build & Verification
To test code optimization compilation and TypeScript type validity, compile the production bundle:
```bash
npm run build
```

---

## Keyboard Shortcuts
- **Play / Pause**: `[Space]`
- **Next Track**: `[Ctrl + Right Arrow]`
- **Previous Track**: `[Ctrl + Left Arrow]`
- **Seek Forward (10 seconds)**: `[Right Arrow]`
- **Seek Backward (10 seconds)**: `[Left Arrow]`
- **Increase Volume**: `[Up Arrow]`
- **Decrease Volume**: `[Down Arrow]`
- **Toggle Mute**: `[M]`

---

## Vercel Deployment Instructions
1. Push your code repository to GitHub, GitLab, or Bitbucket.
2. Log in to Vercel and import your repository.
3. Configure the environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` under Settings -> Environment Variables.
4. Click **Deploy**. Vercel will build the optimized production pages and host the streaming server dynamically.
