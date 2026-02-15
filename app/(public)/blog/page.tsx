import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { createPublicServerClient } from "@/lib/supabase/server";
import { BlogCard } from "@/components/blog/BlogCard";
import { BlogPagination } from "@/components/blog/BlogPagination";
import { SectionHeading } from "@/components/shared/SectionHeading";
import type { BlogPost } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Cleaning tips, home maintenance advice, and news from UltraTidy Cleaning Services in Brantford & the GTA.",
  alternates: {
    canonical: "https://ultratidy.ca/blog",
  },
  openGraph: {
    title: "Blog | UltraTidy Cleaning Services",
    description:
      "Cleaning tips, home maintenance advice, and news from UltraTidy.",
    url: "https://ultratidy.ca/blog",
  },
};

const POSTS_PER_PAGE = 10;

async function getBlogPosts(page: number) {
  const supabase = createPublicServerClient();
  if (!supabase) return { posts: [], total: 0 };

  const from = (page - 1) * POSTS_PER_PAGE;
  const to = from + POSTS_PER_PAGE - 1;

  const { data, error, count } = await supabase
    .from("blog_posts")
    .select("*", { count: "exact" })
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Failed to fetch blog posts:", error);
    return { posts: [], total: 0 };
  }

  return { posts: (data || []) as BlogPost[], total: count || 0 };
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const { posts, total } = await getBlogPosts(page);
  const totalPages = Math.ceil(total / POSTS_PER_PAGE);

  const featuredPost = page === 1 ? posts[0] : null;
  const gridPosts = page === 1 ? posts.slice(1) : posts;

  return (
    <>
      {/* Hero */}
      <section className="relative py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&q=70"
            alt="Person writing at a clean desk"
            fill
            className="object-cover"
            sizes="100vw"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a2a28]/90 via-[#0a2a28]/80 to-background" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(11,189,178,0.15)_0%,_transparent_50%)]" />
        <div className="container mx-auto px-4 relative">
          <SectionHeading
            title="Blog"
            subtitle="Cleaning tips, home maintenance advice, and updates from UltraTidy."
            badge="Latest Articles"
            light
            className="mb-0"
          />
        </div>
      </section>

      {/* Posts */}
      <section className="py-14 md:py-18">
        <div className="container mx-auto px-4 max-w-6xl">
          {posts.length === 0 ? (
            <div className="text-center py-20 max-w-md mx-auto">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">📝</span>
              </div>
              <h3 className="text-2xl font-heading font-bold mb-3">
                No blog posts yet
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                We&apos;re working on helpful cleaning tips and advice. Check
                back soon for our latest articles!
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Featured post (first post on page 1) */}
              {featuredPost && (
                <BlogCard post={featuredPost} featured />
              )}

              {/* Grid of remaining posts */}
              {gridPosts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {gridPosts.map((post) => (
                    <BlogCard key={post.id} post={post} />
                  ))}
                </div>
              )}

              <Suspense>
                <BlogPagination currentPage={page} totalPages={totalPages} />
              </Suspense>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
