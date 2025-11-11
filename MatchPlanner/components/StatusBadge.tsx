import type { CSSProperties } from 'react';
import { getStatusColorClasses } from '@/lib/utils/status-color';
import type { StatusColor } from '@/lib/types/database';

interface StatusBadgeProps {
  color: StatusColor;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StatusBadge({ color, size = 'md', className = '' }: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3.5 w-3.5',
    lg: 'h-5 w-5',
  };

  const colorClasses: Record<StatusColor, string> = {
    red: 'border border-red-900',
    orange: 'border border-amber-700',
    green: 'border border-emerald-700',
  };

  const auraStyles: Record<StatusColor, CSSProperties> = {
    red: { boxShadow: '0 0 0 3px rgba(220, 38, 38, 0.3)' },
    orange: { boxShadow: '0 0 0 3px rgba(245, 158, 11, 0.3)' },
    green: { boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.3)' },
  };

  return (
    <span
      className={`inline-flex rounded-full ${getStatusColorClasses(color)} ${colorClasses[color]} ${sizeClasses[size]} ${className}`}
      style={auraStyles[color]}
      title={
        color === 'red'
          ? 'Délai critique dépassé'
          : color === 'orange'
            ? 'Délai d\'alerte dépassé'
            : 'À jour'
      }
    />
  );
}



