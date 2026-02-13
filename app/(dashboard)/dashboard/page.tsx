"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileText, Tractor, ShoppingBag, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  quoted: "bg-orange-100 text-orange-700",
  booked: "bg-green-100 text-green-700",
  completed: "bg-primary/10 text-primary",
  lost: "bg-red-100 text-red-700",
};

const BUSINESS_COLORS: Record<string, string> = {
  ultratidy: "#0BBDB2",
  dba: "#6366F1",
  primefield: "#F59E0B",
};

interface DashboardData {
  leadsThisMonth: number;
  publishedPosts: number;
  farmRevenue: number;
  dbaSales: number;
  leadsByStatus: { name: string; count: number }[];
  leadsByBusiness: { name: string; value: number }[];
  recentLeads: {
    id: string;
    name: string;
    email: string;
    service: string;
    status: string;
    business: string;
    created_at: string;
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [leadsRes, postsRes, farmRes, dbaRes, recentRes] =
        await Promise.all([
          supabase
            .from("leads")
            .select("status, business", { count: "exact" })
            .gte("created_at", monthStart),
          supabase
            .from("blog_posts")
            .select("id", { count: "exact" })
            .eq("status", "published"),
          supabase
            .from("farm_sales")
            .select("total_amount")
            .gte("created_at", monthStart),
          supabase
            .from("dba_sales")
            .select("amount")
            .gte("created_at", monthStart),
          supabase
            .from("leads")
            .select("id, name, email, service, status, business, created_at")
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

      // Calculate leads by status
      const statusCounts: Record<string, number> = {};
      const businessCounts: Record<string, number> = {};
      (leadsRes.data || []).forEach((lead: { status: string; business: string }) => {
        statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
        businessCounts[lead.business] = (businessCounts[lead.business] || 0) + 1;
      });

      const farmRevenue = (farmRes.data || []).reduce(
        (sum: number, s: { total_amount: number }) => sum + (s.total_amount || 0),
        0
      );
      const dbaTotal = (dbaRes.data || []).reduce(
        (sum: number, s: { amount: number }) => sum + (s.amount || 0),
        0
      );

      setData({
        leadsThisMonth: leadsRes.count || 0,
        publishedPosts: postsRes.count || 0,
        farmRevenue,
        dbaSales: dbaTotal,
        leadsByStatus: Object.entries(statusCounts).map(([name, count]) => ({
          name,
          count,
        })),
        leadsByBusiness: Object.entries(businessCounts).map(
          ([name, value]) => ({ name, value })
        ),
        recentLeads: (recentRes.data || []) as DashboardData["recentLeads"],
      });
      setIsLoading(false);
    }

    loadData();
  }, []);

  return (
    <>
      <DashboardHeader title="Dashboard" />
      <div className="p-4 lg:p-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[110px] rounded-lg" />
            ))
          ) : (
            <>
              <SummaryCard
                title="Leads (this month)"
                value={data?.leadsThisMonth ?? 0}
                icon={Users}
              />
              <SummaryCard
                title="Published Posts"
                value={data?.publishedPosts ?? 0}
                icon={FileText}
              />
              <SummaryCard
                title="Farm Revenue"
                value={`$${(data?.farmRevenue ?? 0).toLocaleString()}`}
                icon={Tractor}
              />
              <SummaryCard
                title="DBA Sales"
                value={`$${(data?.dbaSales ?? 0).toLocaleString()}`}
                icon={ShoppingBag}
              />
            </>
          )}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leads by Status</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px]" />
              ) : data?.leadsByStatus.length ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.leadsByStatus}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis allowDecimals={false} fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0BBDB2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 text-center py-12">
                  No leads yet
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leads by Business</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px]" />
              ) : data?.leadsByBusiness.length ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.leadsByBusiness}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {data.leadsByBusiness.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={BUSINESS_COLORS[entry.name] || "#94A3B8"}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 text-center py-12">
                  No leads yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions + Recent Leads */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/dashboard/leads?new=true">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Lead
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/dashboard/blog/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New Blog Post
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/dashboard/dba/products/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add DBA Product
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Recent Leads</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              ) : data?.recentLeads.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Service
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Date
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentLeads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <Link
                            href={`/dashboard/leads/${lead.id}`}
                            className="font-medium hover:text-primary"
                          >
                            {lead.name}
                          </Link>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-gray-500">
                          {lead.service}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={STATUS_COLORS[lead.status]}
                          >
                            {lead.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-gray-500">
                          {format(new Date(lead.created_at), "MMM d")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">
                  No leads yet. They&apos;ll appear here when customers submit
                  the contact form.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
