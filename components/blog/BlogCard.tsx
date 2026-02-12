import Link from "next/link";
import { Calendar, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
}

export function BlogCard({ post }: BlogCardProps) {
  return (
    <Card className="group hover:shadow-lg transition-shadow h-full overflow-hidden">
      {/* Image placeholder */}
      <div className="aspect-[16/9] bg-muted relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
          <span className="text-3xl font-heading font-bold text-primary/20">
            UT
          </span>
        </div>
      </div>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          {post.published_at && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(post.published_at)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {getReadingTime(post.content)} min read
          </span>
        </div>
        <Link href={`/blog/${post.slug}`}>
          <h3 className="font-heading font-bold text-lg group-hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h3>
        </Link>
        {post.excerpt && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
            {post.excerpt}
          </p>
        )}
        <Link
          href={`/blog/${post.slug}`}
          className="text-sm text-primary font-medium hover:underline underline-offset-4 mt-3 inline-block"
        >
          Read More &rarr;
        </Link>
      </CardContent>
    </Card>
  );
}
