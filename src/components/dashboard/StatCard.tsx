
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  linkHref: string;
  linkText?: string;
  colorClass: string;
  description?: string;
  additionalInfo?: string;
}

export function StatCard({ title, value, icon: Icon, linkHref, linkText = "Περισσότερα", colorClass, description, additionalInfo }: StatCardProps) {
  return (
    <Card className={cn("shadow-md hover:shadow-lg transition-shadow text-white", colorClass)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <Icon className="h-6 w-6 text-white/90" />
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold">{value}</div>
        {description && <p className="text-xs text-white/80 pt-1">{description}</p>}
        {additionalInfo && <p className="text-xs text-white/70 pt-1">{additionalInfo}</p>}
        <Link href={linkHref} className="mt-3 inline-block text-sm font-medium hover:underline text-white/90 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md transition-colors">
          {linkText} &rarr;
        </Link>
      </CardContent>
    </Card>
  );
}
