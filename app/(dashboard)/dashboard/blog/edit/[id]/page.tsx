"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DashboardHeader, DashboardReadError } from "@/components/dashboard/DashboardHeader";
import { BlogForm } from "@/components/dashboard/blog/BlogForm";
import { Skeleton } from "@/components/ui/skeleton";
import type { BlogPost } from "@/types";

export default function EditBlogPostPage() {
  const params = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError,setLoadError]=useState("");
  const [version,setVersion]=useState(0);

  useEffect(() => {
    const controller=new AbortController();setIsLoading(true);setLoadError("");
    void (async()=>{try {const res=await fetch(`/api/blog/${params.id}`,{signal:controller.signal});if(!res.ok)throw Error();const data=await res.json();if(!data?.id)throw Error();if(!controller.signal.aborted){setPost(data);}}
    catch {if(!controller.signal.aborted)setLoadError("This record could not be loaded. Please retry or use the Back link.");}
    finally {if(!controller.signal.aborted)setIsLoading(false);}})();
    return ()=>controller.abort();
  }, [params.id,version]);

  if (isLoading) {
    return (
      <>
        <DashboardHeader title="Edit Post" />
        <div className="mx-auto w-full p-4 lg:p-8 space-y-4 max-w-7xl">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-[400px]" />
        </div>
      </>
    );
  }

  if (loadError||!post) return <DashboardReadError title="Edit Post" message={loadError||"Record unavailable. Please retry."} onRetry={()=>setVersion(v=>v+1)}/>;

  return (
    <>
      <DashboardHeader title="Edit Post" />
      <div className="mx-auto w-full p-4 lg:p-8 max-w-7xl">
        <BlogForm post={post} />
      </div>
    </>
  );
}
