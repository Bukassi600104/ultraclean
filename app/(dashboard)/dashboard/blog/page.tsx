"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardHeader, DashboardReadError } from "@/components/dashboard/DashboardHeader";
import { BlogTable } from "@/components/dashboard/blog/BlogTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import type { BlogPost } from "@/types";

export default function BlogListPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loadError,setLoadError]=useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadPosts() {
    setIsLoading(true);setLoadError("");
    try {
      const res = await fetch("/api/blog");
      const data = await res.json();if(!res.ok||!Array.isArray(data))throw Error();
      setPosts(Array.isArray(data) ? data : []);
    } catch {
      setLoadError("Blog could not be loaded. Please retry.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this post?")) return;
    try {
      const res = await fetch(`/api/blog/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Post deleted");
      loadPosts();
    } catch {
      toast.error("Failed to delete post");
    }
  }

  const filtered = posts.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())
  );

  if(loadError)return <DashboardReadError title="Blog" message={loadError} onRetry={()=>void loadPosts()}/>;
  return (
    <>
      <DashboardHeader title="Blog" />
      <div className="mx-auto w-full p-4 lg:p-8 space-y-4 max-w-7xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
            <Input
              placeholder="Search posts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button size="sm" asChild>
            <Link href="/dashboard/blog/new">
              <Plus className="mr-2 h-4 w-4" />
              New Post
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              <BlogTable posts={filtered} onDelete={handleDelete} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
