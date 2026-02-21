"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { blogPostSchema } from "@/lib/validations";
import { TipTapEditor } from "./TipTapEditor";
import { ImageUpload } from "./ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { BlogPost } from "@/types";

interface FormValues {
  title: string;
  slug: string;
  content?: string;
  excerpt?: string;
  featured_image?: string | null;
  meta_description?: string;
  status?: "draft" | "published";
}

interface BlogFormProps {
  post?: BlogPost;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function BlogForm({ post }: BlogFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState(post?.content || "");
  const [featuredImage, setFeaturedImage] = useState<string | null>(
    post?.featured_image || null
  );
  const [isPublished, setIsPublished] = useState(post?.status === "published");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(blogPostSchema) as any,
    defaultValues: {
      title: post?.title || "",
      slug: post?.slug || "",
      content: post?.content || "",
      excerpt: post?.excerpt || "",
      meta_description: post?.meta_description || "",
      status: post?.status || "draft",
    },
  });

  const title = watch("title");

  // Auto-generate slug from title (only for new posts)
  useEffect(() => {
    if (!post && title) {
      setValue("slug", slugify(title));
    }
  }, [title, post, setValue]);

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    data.content = content;
    data.featured_image = featuredImage;
    data.status = isPublished ? "published" : "draft";

    try {
      const url = post ? `/api/blog/${post.id}` : "/api/blog";
      const method = post ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      toast.success(post ? "Post updated" : "Post created");
      router.push("/dashboard/blog");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save post");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Post title"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-xs text-destructive">
                {errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" placeholder="post-url-slug" {...register("slug")} />
            {errors.slug && (
              <p className="text-xs text-destructive">
                {errors.slug.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Content</Label>
            <TipTapEditor content={content} onChange={setContent} />
          </div>

        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Featured Image</Label>
            <ImageUpload value={featuredImage} onChange={setFeaturedImage} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              rows={3}
              placeholder="Brief summary..."
              {...register("excerpt")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta_description">Meta Description</Label>
            <Textarea
              id="meta_description"
              rows={2}
              placeholder="SEO description..."
              {...register("meta_description")}
            />
          </div>

          <div className="flex items-center gap-3 border-t pt-4">
            <Switch
              checked={isPublished}
              onCheckedChange={setIsPublished}
              id="published"
            />
            <Label htmlFor="published">
              {isPublished ? "Published" : "Draft"}
            </Label>
          </div>

          <div className="flex gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/blog")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {post ? "Update" : "Create"} Post
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
