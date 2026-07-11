import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'flat' | 'inset';
  hoverable?: boolean;
  borderRadius?: 'sm' | 'md' | 'lg' | 'xl' | 'pill';
}

export const NeumorphicCard: React.FC<CardProps> = ({
  children,
  variant = 'flat',
  hoverable = false,
  borderRadius = 'md',
  className = '',
  style,
  ...props
}) => {
  const radiusClass = `var(--radius-${borderRadius})`;
  const baseStyle: React.CSSProperties = {
    borderRadius: radiusClass,
    padding: '16px',
    ...style,
  };

  const variantClass = variant === 'flat' ? 'nm-flat' : 'nm-inset';
  const hoverClass = hoverable && variant === 'flat' ? 'hover:scale-[1.01] hover:shadow-[7px_7px_14px_var(--shadow-dark),-7px_-7px_14px_var(--shadow-light)]' : '';

  return (
    <div
      className={`transition-all duration-200 ${variantClass} ${hoverClass} ${className}`}
      style={baseStyle}
      {...props}
    >
      {children}
    </div>
  );
};
