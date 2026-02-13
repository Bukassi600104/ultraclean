"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ExternalLink } from "lucide-react";
import type { BlogPost } from "@/types";

interface BlogTableProps {
  posts: BlogPost[];
  onDelete: (id: string) => void;
}

export function BlogTable({ posts, onDelete }: BlogTableProps) {
  if (!posts.length) {
    return (
      <p className="text-sm text-gray-500 text-center py-12">
        No blog posts yet. Create your first post!
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden md:table-cell">Date</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {posts.map((post) => (
          <TableRow key={post.id}>
            <TableCell className="font-medium">{post.title}</TableCell>
            <TableCell>
              <Badge
                variant="secondary"
                className={
                  post.status === "published"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }
              >
                {post.status}
              </Badge>
            </TableCell>
            <TableCell className="hidden md:table-cell text-sm text-gray-500">
              {post.published_at
                ? format(new Date(post.published_at), "MMM d, yyyy")
                : format(new Date(post.created_at), "MMM d, yyyy")}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                {post.status === "published" && (
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/blog/${post.slug}`} target="_blank">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/dashboard/blog/edit/${post.id}`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(post.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
