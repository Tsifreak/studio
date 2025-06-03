// src/components/icons/TuningIcon.tsx
import type { SVGProps } from 'react';

export function TuningIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="800px"
      height="800px"
      viewBox="0 0 36 36"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="img"
      preserveAspectRatio="xMidYMid meet"
      {...props} // Spread props to allow className, size, etc.
      className={`iconify iconify--twemoji ${props.className || ''}`} // Added base class and merged with passed className
    >
      <path d="M1 17l8-7l16 1l1 16l-7 8s.001-5.999-6-12s-12-6-12-6z" style={{ fill: props.fill || 'rgb(255, 124, 0)' }} />
      <path fill={props.fill || "#FFAC33"} d="M.973 35s-.036-7.979 2.985-11S15 21.187 15 21.187S14.999 29 11.999 32c-3 3-11.026 3-11.026 3z" />
      <circle fill={props.fill || "#FFCC4D"} cx="8.999" cy="27" r="4" />
      <path d="M35.999 0s-10 0-22 10c-6 5-6 14-4 16s11 2 16-4c10-12 10-22 10-22z" style={{ fill: props.fill || 'rgb(0, 79, 227)' }} />
      <path d="M26.999 5a3.996 3.996 0 0 0-3.641 2.36A3.969 3.969 0 0 1 24.999 7a4 4 0 0 1 4 4c0 .586-.133 1.139-.359 1.64A3.993 3.993 0 0 0 30.999 9a4 4 0 0 0-4-4z" style={{ fill: props.fill || 'rgb(0, 52, 150)' }} />
      <path d="M8 28s0-4 1-5s13.001-10.999 14-10s-9.001 13-10.001 14S8 28 8 28z" style={{ fill: props.fill || 'rgb(255, 124, 0)' }} />
    </svg>
  );
}
