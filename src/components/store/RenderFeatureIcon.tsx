
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
import { ElectricianIcon } from '@/components/icons/ElectricianIcon';
import { TireIcon } from '@/components/icons/TireIcon';
import { MechanicIcon } from '@/components/icons/MechanicIcon';
import { DetailerIcon } from '@/components/icons/DetailerIcon'; // Import new DetailerIcon

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
  Zap, 
  MessageSquare,
  Scale,
  ShieldAlert,
  Combine,
  Package,
  Disc,
  Gauge,
  MyCustomIcon, 
  ElectricianIcon,
  TireIcon,
  MechanicIcon,
  DetailerIcon, // Add new DetailerIcon to map
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
    // For SVG components, we might need to pass fill="currentColor" if their internal fill is hardcoded
    // and we want to control it via CSS. For now, we'll assume the SVG component handles its own fill or uses props.fill
    return <IconComponent className={className} />;
  }
  // Fallback icon if no name or name not in map
  return <CheckCircle2 className={className} />;
}
