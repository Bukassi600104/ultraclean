"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ManagerList() {
  return <Card>
    <CardHeader>
      <CardTitle className="text-base">Team Management</CardTitle>
      <CardDescription>Manage staff access for Primefield Farm, Property and Content in one place.</CardDescription>
    </CardHeader>
    <CardContent>
      <Button asChild><Link href="/dashboard/managers">Manage Accounts</Link></Button>
      <p className="mt-3 text-sm text-muted-foreground">Create accounts, suspend or reactivate staff, reset passwords, and remove access while preserving historical entries.</p>
    </CardContent>
  </Card>;
}
