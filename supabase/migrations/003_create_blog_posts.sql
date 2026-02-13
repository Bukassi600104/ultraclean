-- Blog posts table
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  content text not null default '',
  excerpt text,
  featured_image text,
  meta_description text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  author_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_blog_posts_slug on public.blog_posts(slug);
create index idx_blog_posts_status on public.blog_posts(status);
create index idx_blog_posts_published_at on public.blog_posts(published_at desc);
