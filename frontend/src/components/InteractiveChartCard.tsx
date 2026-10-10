import React, { useState, useEffect, useRef } from 'react';
import { Maximize2, X, Sparkles } from 'lucide-react';

interface InteractiveChartCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerRight?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  chartHeight?: string;
}

export const InteractiveChartCard: React.FC<InteractiveChartCardProps> = ({
  title,
  subtitle,
  headerRight,
  description,
  children,
  className = '',
  chartHeight = 'h-[450px]',
}) => {
  const [isPoppedOut, setIsPoppedOut] = useState(false);
  const [hoverSeconds, setHoverSeconds] = useState(0); // 0 to 3
  const [isHovering, setIsHovering] = useState(false);

  const hoverTimerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  const startHover = () => {
    if (isPoppedOut) return;
    setIsHovering(true);
    setHoverSeconds(0);
    const startTime = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsedSec = (Date.now() - startTime) / 1000;
      setHoverSeconds(Math.min(3, elapsedSec));
    }, 100);

    hoverTimerRef.current = setTimeout(() => {
      clearInterval(intervalRef.current);
      setHoverSeconds(0);
      setIsHovering(false);
      setIsPoppedOut(true);
    }, 3000);
  };

  const cancelHover = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsHovering(false);
    setHoverSeconds(0);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPoppedOut) {
        setIsPoppedOut(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPoppedOut]);

  return (
    <>
      {/* Regular Inline Card */}
      <div
        onMouseEnter={startHover}
        onMouseLeave={cancelHover}
        className={`industrial-card p-8 relative group transition-all duration-300 ${className} ${
          isHovering ? 'ring-1 ring-indigo-500/50 shadow-xl shadow-indigo-950/30' : ''
        }`}
      >
        {/* Card Header */}
        {(title || subtitle || headerRight) && (
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="min-w-0 flex-1">
              {title && (
                <div className="flex items-center space-x-3">
                  {typeof title === 'string' ? (
                    <h4 className="text-xl font-black text-white tracking-tight truncate">{title}</h4>
                  ) : (
                    title
                  )}
                </div>
              )}
              {subtitle && (
                <div className="text-sm text-slate-400 font-medium mt-1">
                  {subtitle}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {headerRight}

              {/* Hover Timer Progress Indicator */}
              {isHovering && !isPoppedOut && (
                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-[11px] font-bold text-indigo-300 animate-pulse">
                  <Sparkles size={12} className="text-indigo-400" />
                  <span>Enlarging in {(3 - hoverSeconds).toFixed(1)}s</span>
                </div>
              )}

              {/* Instant Maximize Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  cancelHover();
                  setIsPoppedOut(true);
                }}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                title="Click to enlarge graph (or hover 3s)"
              >
                <Maximize2 size={16} />
              </button>
            </div>
          </div>
        )}

        {description && (
          <div className="text-xs text-slate-400 mb-4 leading-relaxed">
            {description}
          </div>
        )}

        {/* Chart View */}
        <div className={`${chartHeight} w-full relative`}>
          {isPoppedOut ? (
            <div className="w-full h-full flex flex-col items-center justify-center rounded-xl bg-slate-900/60 border border-slate-800/80 text-slate-400 text-sm space-y-2">
              <Maximize2 size={28} className="text-indigo-400 animate-pulse" />
              <span className="font-semibold text-slate-300">Graph popped out in enlarged view</span>
              <button
                onClick={() => setIsPoppedOut(false)}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
              >
                Close enlarged view
              </button>
            </div>
          ) : (
            children
          )}
        </div>
      </div>

      {/* Enlarged Pop-out Modal Overlay (Active when isPoppedOut is true) */}
      {isPoppedOut && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200"
          onClick={() => setIsPoppedOut(false)}
        >
          <div
            className="w-full max-w-7xl h-[88vh] bg-slate-900/95 border border-indigo-500/50 rounded-3xl p-8 flex flex-col shadow-2xl shadow-indigo-950/80 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pop-out Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-5 shrink-0">
              <div>
                <div className="flex items-center space-x-3">
                  {typeof title === 'string' ? (
                    <h3 className="text-2xl font-black text-white tracking-tight">{title}</h3>
                  ) : (
                    title
                  )}
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1.5">
                    <Sparkles size={12} />
                    <span>ENLARGED INTERACTIVE VIEW</span>
                  </span>
                </div>
                {subtitle && (
                  <p className="text-sm font-medium text-slate-400 mt-1">{subtitle}</p>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-xs text-slate-500 hidden sm:inline font-mono">Press Esc to close</span>
                <button
                  onClick={() => setIsPoppedOut(false)}
                  className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700"
                  title="Close Enlarged View"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {description && (
              <div className="text-sm text-slate-300 mb-4 bg-slate-800/40 p-3 rounded-xl border border-slate-800 shrink-0">
                {description}
              </div>
            )}

            {/* Enlarged Chart Container */}
            <div className="flex-1 w-full min-h-0 relative">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
