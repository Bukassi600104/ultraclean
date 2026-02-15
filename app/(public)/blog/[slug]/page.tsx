import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  ArrowLeft,
  ArrowRight,
  Phone,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { createPublicServerClient } from "@/lib/supabase/server";
import { ShareButtons } from "@/components/blog/ShareButtons";
import type { BlogPost } from "@/types";

export const dynamic = "force-dynamic";

function getReadingTime(content: string): number {
  const words = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function getPost(slug: string): Promise<BlogPost | null> {
  const supabase = createPublicServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !data) return null;
  return data as BlogPost;
}

async function getOtherPosts(currentId: string): Promise<BlogPost[]> {
  const supabase = createPublicServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("blog_posts")
    .select("id, title, slug, featured_image, published_at, excerpt, content, status, created_at, updated_at, author_id, meta_description")
    .eq("status", "published")
    .neq("id", currentId)
    .order("published_at", { ascending: false })
    .limit(5);

  return (data || []) as BlogPost[];
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: "Post Not Found" };

  return {
    title: post.title,
    description: post.meta_description || post.excerpt || "",
    openGraph: {
      title: post.title,
      description: post.meta_description || post.excerpt || "",
      url: `https://ultratidy.ca/blog/${post.slug}`,
      type: "article",
      publishedTime: post.published_at || undefined,
      ...(post.featured_image && {
        images: [{ url: post.featured_image }],
      }),
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  const otherPosts = await getOtherPosts(post.id);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.meta_description || post.excerpt,
    url: `https://ultratidy.ca/blog/${post.slug}`,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      "@type": "Organization",
      name: "UltraTidy Cleaning Services",
    },
    publisher: {
      "@type": "Organization",
      name: "UltraTidy Cleaning Services",
      url: "https://ultratidy.ca",
    },
    ...(post.featured_image && {
      image: post.featured_image,
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* Hero with featured image */}
      {post.featured_image && (
        <section className="relative h-[40vh] min-h-[300px] max-h-[480px] overflow-hidden">
          <Image
            src={post.featured_image}
            alt={post.title}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </section>
      )}

      <div className={post.featured_image ? "relative -mt-24" : "pt-20"}>
        <div className="container mx-auto px-4">
          {/* Back link */}
          <div className="max-w-6xl mx-auto">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Link>
          </div>

          {/* Main layout: sidebar + article */}
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-10">
            {/* Sidebar — shows below article on mobile, left on desktop */}
            <aside className="order-2 lg:order-1 lg:w-72 lg:shrink-0">
              <div className="lg:sticky lg:top-24 space-y-6">
                {/* Other articles */}
                {otherPosts.length > 0 && (
                  <div className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm">
                    <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      More Articles
                    </h3>
                    <div className="space-y-4">
                      {otherPosts.map((p) => (
                        <Link
                          key={p.id}
                          href={`/blog/${p.slug}`}
                          className="group flex gap-3 items-start"
                        >
                          <div className="relative w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-muted">
                            {p.featured_image ? (
                              <Image
                                src={p.featured_image}
                                alt={p.title}
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-500"
                                sizes="64px"
                              />
                            ) : (
                              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
                            )}
                          </div>
                          <span className="text-sm font-medium leading-tight group-hover:text-primary transition-colors line-clamp-2">
                            {p.title}
                          </span>
                        </Link>
                      ))}
                    </div>
                    <Link
                      href="/blog"
                      className="inline-flex items-center gap-1 text-xs text-primary font-semibold mt-4 hover:gap-2 transition-all"
                    >
                      View all articles <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}

                {/* Share */}
                <div className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm">
                  <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3">
                    Share This Article
                  </h3>
                  <ShareButtons title={post.title} slug={post.slug} />
                </div>

                {/* Quick links */}
                <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 to-transparent p-5 shadow-sm">
                  <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">
                    Quick Links
                  </h3>
                  <div className="space-y-2.5">
                    <Link
                      href="/services"
                      className="flex items-center gap-2.5 text-sm text-foreground/80 hover:text-primary transition-colors"
                    >
                      <Sparkles className="h-4 w-4 text-primary" />
                      Our Services
                    </Link>
                    <Link
                      href="/gallery"
                      className="flex items-center gap-2.5 text-sm text-foreground/80 hover:text-primary transition-colors"
                    >
                      <Image
                        src="/logo-icon.png"
                        alt=""
                        width={16}
                        height={16}
                        className="opacity-60"
                      />
                      See Our Work
                    </Link>
                    <Link
                      href="/contact"
                      className="flex items-center gap-2.5 text-sm text-foreground/80 hover:text-primary transition-colors"
                    >
                      <Phone className="h-4 w-4 text-primary" />
                      Get a Free Quote
                    </Link>
                  </div>
                </div>

                {/* CTA card */}
                <div className="rounded-2xl overflow-hidden">
                  <div className="bg-gradient-to-br from-[#0a2a28] to-[#0a3a36] p-6 text-center">
                    <p className="text-white font-heading font-bold text-lg leading-snug">
                      Need a professional clean?
                    </p>
                    <p className="text-white/60 text-sm mt-1.5">
                      It&apos;s not clean until it&apos;s ULTRACLEAN!
                    </p>
                    <Link
                      href="/contact"
                      className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
                    >
                      Book Now <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </aside>

            {/* Article content */}
            <article className="order-1 lg:order-2 min-w-0 flex-1">
              {/* Header */}
              <header className="mb-10">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold tracking-tight">
                  {post.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 mt-5 text-sm text-muted-foreground">
                  {post.published_at && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {formatDate(post.published_at)}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {getReadingTime(post.content)} min read
                  </span>
                </div>
                {/* Mobile-only share (sidebar handles desktop) */}
                <div className="mt-5 lg:hidden">
                  <ShareButtons title={post.title} slug={post.slug} />
                </div>
              </header>

              {/* Content */}
              <div
                className="prose prose-lg max-w-none prose-headings:font-heading prose-a:text-primary prose-img:rounded-xl"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />

              {/* Bottom share + CTA */}
              <div className="mt-12 pt-8 border-t">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <ShareButtons title={post.title} slug={post.slug} />
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors w-fit"
                  >
                    Get a Free Quote <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Related posts below article */}
              {otherPosts.length > 0 && (
                <section className="mt-16 pt-12 border-t">
                  <h2 className="text-2xl font-heading font-bold mb-8">
                    More from the Blog
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {otherPosts.slice(0, 2).map((p) => (
                      <Link
                        key={p.id}
                        href={`/blog/${p.slug}`}
                        className="group flex gap-4 items-start rounded-2xl border border-border/50 bg-white p-4 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="relative w-24 h-20 rounded-xl overflow-hidden shrink-0 bg-muted">
                          {p.featured_image ? (
                            <Image
                              src={p.featured_image}
                              alt={p.title}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-500"
                              sizes="96px"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading font-bold text-base group-hover:text-primary transition-colors line-clamp-2">
                            {p.title}
                          </h3>
                          {p.excerpt && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {p.excerpt}
                            </p>
                          )}
                          <span className="inline-flex items-center gap-1 text-xs text-primary font-semibold mt-2">
                            Read More <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </article>
          </div>
        </div>
      </div>

      {/* Bottom spacing */}
      <div className="h-20" />
    </>
  );
}
