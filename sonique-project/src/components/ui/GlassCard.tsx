import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
}

export function GlassCard({ children, className = '', intensity = 'medium', ...props }: GlassCardProps) {
  const blurClasses = {
    low: 'bg-zinc-950/20 backdrop-blur-sm border-white/5',
    medium: 'bg-zinc-950/40 backdrop-blur-md border-white/10',
    high: 'bg-zinc-950/60 backdrop-blur-lg border-white/20',
  };

  return (
    <div
      className={`rounded-xl border shadow-xl transition-all duration-300 ${blurClasses[intensity]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
