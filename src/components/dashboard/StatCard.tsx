
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
  colorClass: string; // This will now expect bg and text color, e.g., "bg-blue-600 text-white"
  description?: string;
  additionalInfo?: string;
}

export function StatCard({ title, value, icon: Icon, linkHref, linkText = "Περισσότερα", colorClass, description, additionalInfo }: StatCardProps) {
  return (
    <Card className={cn("shadow-md hover:shadow-lg transition-shadow", colorClass)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {/* Icon color will be inherited from the text color set by colorClass */}
        <Icon className="h-6 w-6 opacity-90" /> 
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold">{value}</div> {/* Text color inherited */}
        {description && <p className="text-xs opacity-80 pt-1">{description}</p>} {/* Text color inherited */}
        {additionalInfo && <p className="text-xs opacity-70 pt-1">{additionalInfo}</p>} {/* Text color inherited */}
        <Link
          href={linkHref}
          className={cn(
            "mt-3 inline-block text-sm font-medium hover:underline px-3 py-1 rounded-md transition-colors",
            // Heuristic for link styling: if colorClass indicates white text, assume dark background
            colorClass.includes("text-white") || colorClass.includes("text-primary-foreground") || colorClass.includes("text-accent-foreground")
              ? "opacity-90 bg-white/20 hover:bg-white/30" // Link style for dark card backgrounds
              : "opacity-90 bg-black/5 hover:bg-black/10" // Link style for light card backgrounds
          )}
        >
          {linkText} &rarr;
        </Link>
      </CardContent>
    </Card>
  );
}
