'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary:   'bg-[#d4e0b5] hover:bg-[#b8cc8a] text-[#3d2f20] border border-[#b8cc8a]',
  secondary: 'bg-[#b5d5e0] hover:bg-[#8abfcf] text-[#3d2f20] border border-[#8abfcf]',
  ghost:     'bg-transparent hover:bg-[#f5f0e8] text-[#6b5744] border border-[#e8e0d0]',
  danger:    'bg-[#fbcfe8] hover:bg-[#f9a8d4] text-[#831843] border border-[#f9a8d4]',
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5',
  md: 'px-4 py-2 text-sm rounded-2xl gap-2',
  lg: 'px-6 py-3 text-base rounded-2xl gap-2.5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  onClick,
  type = 'button',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.div
      whileTap={{ scale: isDisabled ? 1 : 0.97 }}
      whileHover={{ scale: isDisabled ? 1 : 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{ display: 'inline-flex' }}
    >
      <button
        type={type}
        disabled={isDisabled}
        onClick={onClick}
        className={cn(
          'inline-flex items-center justify-center font-sans font-medium transition-colors duration-150 cursor-pointer select-none',
          variantStyles[variant],
          sizeStyles[size],
          isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          className
        )}
        {...rest}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        ) : icon}
        {children}
      </button>
    </motion.div>
  );
}
