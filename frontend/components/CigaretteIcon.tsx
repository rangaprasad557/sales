import React from 'react';

interface CigaretteIconProps {
  className?: string;
  size?: number;
}

export function CigaretteIcon({ className = 'w-6 h-6', size = 24 }: CigaretteIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Cigarette Sales Icon"
      role="img"
    >
      {/* Cigarette Body */}
      <rect x="2" y="12" width="20" height="7" rx="1.5" />
      {/* Cigarette Filter Divider */}
      <line x1="7" y1="12" x2="7" y2="19" strokeWidth="2.5" />
      {/* Glowing Ember tip */}
      <line x1="21" y1="13.5" x2="21" y2="17.5" stroke="#ef4444" strokeWidth="2" />
      {/* Sleek Rising Smoke Trails */}
      <path
        d="M17 9c.5-1.5-.5-2.5 0-4s1.5-1 1-2.5"
        strokeWidth="1.75"
        strokeDasharray="2 1"
        className="opacity-75"
      />
      <path
        d="M20 9c.5-1.5-.5-2.5 0-4s1.5-1 1-2.5"
        strokeWidth="1.75"
        strokeDasharray="2 1"
        className="opacity-60"
      />
    </svg>
  );
}
