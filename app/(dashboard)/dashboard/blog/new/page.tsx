"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BlogForm } from "@/components/dashboard/blog/BlogForm";

export default function NewBlogPostPage() {
  return (
    <>
      <DashboardHeader title="New Blog Post" />
      <div className="p-4 lg:p-8">
        <BlogForm />
      </div>
    </>
  );
}
