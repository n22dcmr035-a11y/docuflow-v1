'use client';

import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({ children, className, onClick, hoverable = false }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-2xl card-shadow border border-[#e8e0d0] p-5',
        hoverable &&
          'cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(60,40,20,0.12)]',
        className
      )}
    >
      {children}
    </div>
  );
}
