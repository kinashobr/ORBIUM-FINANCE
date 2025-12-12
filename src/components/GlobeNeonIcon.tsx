import React from 'react';
import { cn } from '@/lib/utils';

interface GlobeNeonIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

// Baseado no ícone Globe da Lucide, mas com um estilo que remete ao neon
export function GlobeNeonIcon({ className, ...props }: GlobeNeonIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-6 h-6 text-neon-cyan", className)}
      {...props}
    >
      {/* Globo principal */}
      <circle cx="12" cy="12" r="10" />
      {/* Linhas de latitude e longitude */}
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      <path d="M2 12h20" />
      {/* Anéis orbitais (simulando o estilo do logo) */}
      <path d="M21.5 10c-.8 1.5-1.5 3-1.5 5s.7 3.5 1.5 5" />
      <path d="M2.5 10c.8 1.5 1.5 3 1.5 5s-.7 3.5-1.5 5" />
    </svg>
  );
}