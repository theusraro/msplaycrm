import React from 'react';

interface MsplayLogoProps {
  variant?: 'horizontal' | 'stacked' | 'icon' | 'compact';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  withContainer?: boolean;
}

export const MsplayLogo: React.FC<MsplayLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  withContainer = false,
}) => {
  // Icon Only (App Icon / Favicon style)
  if (variant === 'icon') {
    const iconSizes = {
      xs: 'h-6 w-6',
      sm: 'h-8 w-8',
      md: 'h-10 w-10',
      lg: 'h-14 w-14',
      xl: 'h-20 w-20',
    };
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 ${iconSizes[size]} ${className}`}>
        <img
          src="/icons/icon-192x192.png"
          alt="MSPLAY CRM"
          className="w-full h-full object-contain rounded-xl shadow-md"
        />
      </div>
    );
  }

  // Stacked Logo (Login / Splash style)
  if (variant === 'stacked') {
    return (
      <div className={`inline-flex flex-col items-center justify-center select-none ${className}`}>
        {withContainer ? (
          <div className="bg-[#0a0a0a] px-8 py-6 rounded-2xl border border-zinc-800/80 shadow-2xl flex flex-col items-center relative overflow-hidden">
            {/* Ambient Red Glow */}
            <div className="absolute inset-0 bg-radial-gradient from-red-600/15 via-transparent to-transparent pointer-events-none"></div>
            
            <div className="flex items-center tracking-tight relative z-10">
              <span className="text-4xl sm:text-5xl font-black text-[#E50914] font-['Arial_Black',sans-serif]">MS</span>
              <span className="relative text-4xl sm:text-5xl font-black text-white font-['Arial_Black',sans-serif] ml-0.5">
                PL
                <span className="relative inline-block">
                  A
                  <span className="absolute top-1/2 left-1/2 -translate-x-[40%] -translate-y-[45%] text-[#E50914] text-xs sm:text-sm font-black pointer-events-none">
                    &#9654;
                  </span>
                </span>
                Y
              </span>
            </div>
            
            <div className="flex items-center gap-3 mt-3 w-full justify-center relative z-10">
              <div className="h-[2px] w-10 bg-gradient-to-r from-transparent to-[#E50914]"></div>
              <span className="px-3.5 py-1 rounded-lg bg-[#0d0d0d] border border-[#E50914] text-white text-xs sm:text-sm font-black tracking-widest shadow-md">
                CRM
              </span>
              <div className="h-[2px] w-10 bg-gradient-to-l from-transparent to-[#E50914]"></div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center tracking-tight">
              <span className="text-3xl sm:text-4xl font-black text-[#E50914] font-['Arial_Black',sans-serif]">MS</span>
              <span className="relative text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-['Arial_Black',sans-serif] ml-0.5">
                PL
                <span className="relative inline-block">
                  A
                  <span className="absolute top-1/2 left-1/2 -translate-x-[40%] -translate-y-[45%] text-[#E50914] text-xs sm:text-sm font-black pointer-events-none">
                    &#9654;
                  </span>
                </span>
                Y
              </span>
            </div>
            <div className="flex items-center gap-2.5 mt-2 justify-center">
              <div className="h-[1.5px] w-8 bg-gradient-to-r from-transparent to-[#E50914]"></div>
              <span className="px-2.5 py-0.5 rounded-md bg-zinc-900 dark:bg-zinc-950 border border-[#E50914] text-white text-[11px] font-black tracking-widest shadow-sm">
                CRM
              </span>
              <div className="h-[1.5px] w-8 bg-gradient-to-l from-transparent to-[#E50914]"></div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Compact Header / Nav Logo
  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2 select-none ${className}`}>
        <div className="flex items-center tracking-tight leading-none">
          <span className="text-xl font-black text-[#E50914] font-['Arial_Black',sans-serif]">MS</span>
          <span className="relative text-xl font-black text-slate-900 dark:text-white font-['Arial_Black',sans-serif] ml-0.5">
            PL
            <span className="relative inline-block">
              A
              <span className="absolute top-1/2 left-1/2 -translate-x-[35%] -translate-y-[45%] text-[#E50914] text-[9px] font-black pointer-events-none">
                &#9654;
              </span>
            </span>
            Y
          </span>
        </div>
        <span className="px-1.5 py-0.5 rounded bg-zinc-900 dark:bg-zinc-950 border border-[#E50914] text-white text-[9px] font-black tracking-wider leading-none shadow-sm">
          CRM
        </span>
      </div>
    );
  }

  // Default: Horizontal Logo
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div className="flex items-center tracking-tight leading-none">
        <span className="text-2xl font-black text-[#E50914] font-['Arial_Black',sans-serif]">MS</span>
        <span className="relative text-2xl font-black text-slate-900 dark:text-white font-['Arial_Black',sans-serif] ml-0.5">
          PL
          <span className="relative inline-block">
            A
            <span className="absolute top-1/2 left-1/2 -translate-x-[40%] -translate-y-[45%] text-[#E50914] text-[10px] font-black pointer-events-none">
              &#9654;
            </span>
          </span>
          Y
        </span>
      </div>
      <span className="px-2 py-0.5 rounded-lg bg-zinc-900 dark:bg-zinc-950 border border-[#E50914] text-white text-xs font-black tracking-widest leading-none shadow-sm">
        CRM
      </span>
    </div>
  );
};
