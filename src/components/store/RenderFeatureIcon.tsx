
"use client";

import { 
    CheckCircle2, Zap, Award, Users, BarChart3, ShieldCheck, 
    MessageSquare, Car, Paintbrush, Search, Wrench, Settings2, 
    Sparkles, PackageCheck, Scale, ShieldAlert, Combine, AlignCenter, 
    ClipboardCheck, Package, Disc, Gauge // Added Disc, Gauge
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
  Disc, // Added Disc
  Gauge, // Added Gauge
  CheckCircle2, // Default/fallback
  UnknownIcon: CheckCircle2, 
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
