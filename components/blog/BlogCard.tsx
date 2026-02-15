import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import type { BlogPost } from "@/types";

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

interface BlogCardProps {
  post: BlogPost;
  featured?: boolean;
}

export function BlogCard({ post, featured = false }: BlogCardProps) {
  if (featured) {
    return (
      <Link href={`/blog/${post.slug}`} className="group block">
        <article className="relative rounded-2xl overflow-hidden bg-white border border-border/50 shadow-sm hover:shadow-xl transition-all duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Image */}
            <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[360px] overflow-hidden">
              {post.featured_image ? (
                <Image
                  src={post.featured_image}
                  alt={post.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>

            {/* Content */}
            <div className="p-8 md:p-10 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider w-fit mb-4">
                Featured Article
              </div>
              <h2 className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight group-hover:text-primary transition-colors duration-300">
                {post.title}
              </h2>
              {post.excerpt && (
                <p className="text-muted-foreground mt-3 leading-relaxed line-clamp-3">
                  {post.excerpt}
                </p>
              )}
              <div className="flex items-center gap-4 mt-5 text-sm text-muted-foreground">
                {post.published_at && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(post.published_at)}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {getReadingTime(post.content)} min read
                </span>
              </div>
              <div className="mt-6">
                <span className="inline-flex items-center gap-2 text-primary font-semibold group-hover:gap-3 transition-all duration-300">
                  Read Article <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link href={`/blog/${post.slug}`} className="group block h-full">
      <article className="relative rounded-2xl overflow-hidden bg-white border border-border/50 shadow-sm hover:shadow-xl transition-all duration-500 h-full flex flex-col">
        {/* Accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-primary to-primary/50 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />

        {/* Image */}
        <div className="relative aspect-[16/10] overflow-hidden">
          {post.featured_image ? (
            <Image
              src={post.featured_image}
              alt={post.title}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-700"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col flex-1">
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            {post.published_at && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                {formatDate(post.published_at)}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              {getReadingTime(post.content)} min read
            </span>
          </div>
          <h3 className="font-heading font-bold text-lg group-hover:text-primary transition-colors duration-300 line-clamp-2">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-3 leading-relaxed flex-1">
              {post.excerpt}
            </p>
          )}
          <div className="mt-4 pt-4 border-t border-border/50">
            <span className="inline-flex items-center gap-2 text-sm text-primary font-semibold group-hover:gap-3 transition-all duration-300">
              Read More <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
