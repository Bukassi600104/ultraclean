import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, Clock, ArrowLeft } from "lucide-react";
import { createPublicServerClient } from "@/lib/supabase/server";
import { ShareButtons } from "@/components/blog/ShareButtons";
import { RelatedPosts } from "@/components/blog/RelatedPosts";
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

async function getRelatedPosts(
  currentId: string
): Promise<BlogPost[]> {
  const supabase = createPublicServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("status", "published")
    .neq("id", currentId)
    .order("published_at", { ascending: false })
    .limit(3);

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

  const relatedPosts = await getRelatedPosts(post.id);

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

      <article className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Back link */}
            <Link
              href="/blog"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Link>

            {/* Header */}
            <header className="mb-8">
              <h1 className="text-3xl md:text-4xl font-heading font-extrabold tracking-tight">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                {post.published_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(post.published_at)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {getReadingTime(post.content)} min read
                </span>
              </div>
              <div className="mt-4">
                <ShareButtons title={post.title} slug={post.slug} />
              </div>
            </header>

            {/* Content */}
            <div
              className="prose prose-lg max-w-none prose-headings:font-heading prose-a:text-primary"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Bottom share */}
            <div className="mt-12 pt-8 border-t">
              <ShareButtons title={post.title} slug={post.slug} />
            </div>

            {/* Related */}
            <RelatedPosts posts={relatedPosts} />
          </div>
        </div>
      </article>
    </>
  );
}
