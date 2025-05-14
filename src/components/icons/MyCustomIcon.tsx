// src/components/icons/MyCustomIcon.tsx
import type { SVGProps } from 'react';

export function MyCustomIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* 
        === PASTE YOUR SVG PATHS HERE === 
        Remove the placeholder path below and add your SVG's <path>, <circle>, etc. elements.
        Example: <path d="M12 2L2 7l10 5 10-5-10-5z" /> 
      */}
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /> {/* Placeholder Shield Icon */}
      <line x1="12" y1="12" x2="12" y2="18" />
      <path d="M12 6v2" />
      {/* Replace the path above with your SVG content. */}
    </svg>
  );
}
