"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BlogForm } from "@/components/dashboard/blog/BlogForm";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { BlogPost } from "@/types";

export default function EditBlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPost() {
      try {
        const res = await fetch(`/api/blog/${params.id}`);
        if (!res.ok) throw new Error();
        setPost(await res.json());
      } catch {
        toast.error("Post not found");
        router.push("/dashboard/blog");
      } finally {
        setIsLoading(false);
      }
    }
    loadPost();
  }, [params.id, router]);

  if (isLoading) {
    return (
      <>
        <DashboardHeader title="Edit Post" />
        <div className="p-4 lg:p-8 space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-[400px]" />
        </div>
      </>
    );
  }

  if (!post) return null;

  return (
    <>
      <DashboardHeader title="Edit Post" />
      <div className="p-4 lg:p-8">
        <BlogForm post={post} />
      </div>
    </>
  );
}
