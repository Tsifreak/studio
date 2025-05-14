
"use client";

import { 
    CheckCircle2, Zap, Award, Users, BarChart3, ShieldCheck, 
    MessageSquare, Car, Paintbrush, Search, Wrench, Settings2, 
    Sparkles, PackageCheck, Scale, ShieldAlert, Combine, AlignCenter, 
    ClipboardCheck, Package, Disc, Gauge
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';
import { MyCustomIcon } from '@/components/icons/MyCustomIcon'; 
import { ElectricianIcon } from '@/components/icons/ElectricianIcon'; // Import new ElectricianIcon

// Map of string icon names to Lucide components
const iconMap: { [key: string]: ComponentType<LucideProps> | ComponentType<React.SVGProps<SVGSVGElement>> } = {
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
  Zap, // Original Lucide Zap
  MessageSquare,
  Scale,
  ShieldAlert,
  Combine,
  Package,
  Disc,
  Gauge,
  MyCustomIcon, 
  ElectricianIcon, // Add new ElectricianIcon to map
  CheckCircle2, 
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
