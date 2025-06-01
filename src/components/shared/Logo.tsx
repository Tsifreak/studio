// src/components/shared/Logo.tsx
import Link from 'next/link';
import { AmaxakisCustomLogo } from '@/components/icons/AmaxakisCustomLogo'; // Import the new custom logo

interface LogoProps {
  className?: string;
  iconSize?: number;
  // textSize prop is no longer needed as text is removed
}

export function Logo({ className, iconSize = 32 }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center ${className}`}>
      <AmaxakisCustomLogo
        // The className is passed for potential CSS styling, but fill is determined by SVG's internal styles
        className="text-primary" // This class primarily helps if any SVG part uses 'currentColor'
        width={iconSize * 2} // Adjusted width based on typical logo aspect ratios; tweak as needed
        height={iconSize}   // Height remains based on iconSize
        aria-label="Amaxakis Logo" // Added aria-label for accessibility since text is removed
      />
      {/* The <span> element for the text "Amaxakis" has been removed */}
    </Link>
  );
}
