import React from 'react';

export const Logo = ({ variant = 'dark', size = 'md', showSubtitle = true }) => {
  const isDarkBg = variant === 'dark'; // inside dark sidebar
  const isLight = variant === 'light'; // inside white card / mobile header

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12',
  };

  const titleSizes = {
    sm: 'text-sm font-bold',
    md: 'text-base font-bold',
    lg: 'text-xl font-extrabold',
    xl: 'text-2xl font-extrabold',
  };

  const subtitleSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm',
  };

  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* Scale of Justice SVG Icon matching reference */}
      <div
        className={`${
          iconSizes[size]
        } flex items-center justify-center shrink-0 ${
          isDarkBg ? 'text-sky-400' : 'text-[#0B1B2B]'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-full h-full"
        >
          {/* Central pillar */}
          <path d="M12 3v18" />
          <path d="M8 21h8" />
          {/* Top beam */}
          <path d="M4 7h16" />
          {/* Left scale pan */}
          <path d="m4 7-2 6c0 1.5 1.5 2.5 3 2.5s3-1 3-2.5L6 7" />
          {/* Right scale pan */}
          <path d="m18 7-2 6c0 1.5 1.5 2.5 3 2.5s3-1 3-2.5L20 7" />
        </svg>
      </div>

      <div className="flex flex-col">
        <span
          className={`${titleSizes[size]} tracking-tight leading-tight ${
            isDarkBg ? 'text-white' : 'text-[#0B1B2B]'
          }`}
        >
          LegalMetriScan
        </span>
        {showSubtitle && (
          <span
            className={`${subtitleSizes[size]} ${
              isDarkBg ? 'text-slate-400' : 'text-slate-500'
            } leading-tight font-medium mt-0.5`}
          >
            AI-Powered Packaged Commodity Verification
          </span>
        )}
      </div>
    </div>
  );
};

export default Logo;
