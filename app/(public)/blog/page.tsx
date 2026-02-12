import type { Metadata } from "next";
import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase/server";
import { BlogCard } from "@/components/blog/BlogCard";
import { BlogPagination } from "@/components/blog/BlogPagination";
import { SectionHeading } from "@/components/shared/SectionHeading";
import type { BlogPost } from "@/types";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Cleaning tips, home maintenance advice, and news from UltraTidy Cleaning Services in Toronto & the GTA.",
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
  const supabase = createServerClient();
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

  return (
    <>
      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 gradient-dark" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(11,189,178,0.15)_0%,_transparent_50%)]" />
        <div className="container mx-auto px-4 relative">
          <SectionHeading
            title="Blog"
            subtitle="Cleaning tips, home maintenance advice, and updates from UltraTidy."
            badge="Latest Articles"
            light
          />
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
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
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
              <Suspense>
                <BlogPagination currentPage={page} totalPages={totalPages} />
              </Suspense>
            </>
          )}
        </div>
      </section>
    </>
  );
}
