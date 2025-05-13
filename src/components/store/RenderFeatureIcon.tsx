
"use client";

import { 
    CheckCircle2, Zap, Award, Users, BarChart3, ShieldCheck, 
    MessageSquare, Car, Paintbrush, Search, Wrench, Settings2, 
    Sparkles, PackageCheck, Scale, ShieldAlert, Combine, AlignCenter, 
    ClipboardCheck, Package 
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';

// Map of string icon names to Lucide components
const iconMap: { [key: string]: ComponentType<LucideProps> } = {
  Award,
  ShieldCheck,
  Users,
  Search,
  Wrench,
  Paintbrush,
  Sparkles,
  Settings2,
  BarChart3,
  ClipboardCheck,
  Car,
  AlignCenter,
  PackageCheck,
  Zap,
  MessageSquare,
  Scale,
  ShieldAlert,
  Combine,
  Package,
  CheckCircle2, // Default/fallback
  UnknownIcon: CheckCircle2, // Fallback for unknown strings derived from components
  // Lucide icon components typically have a displayName property that matches their import name
  // e.g., Award.displayName is 'Award'
  // If (feature.icon as Function).name is used, it might also be 'Award'
};

interface RenderFeatureIconProps {
  iconName?: string;
  className?: string;
}

export function RenderFeatureIcon({ iconName, className }: RenderFeatureIconProps) {
  const IconComponent = iconName ? iconMap[iconName] : null;

  if (IconComponent) {
    return <IconComponent className={className} />;
  }
  // Fallback icon if no name or name not in map
  return <CheckCircle2 className={className} />;
}
