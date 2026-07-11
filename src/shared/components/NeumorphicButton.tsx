import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'flat' | 'inset' | 'primary' | 'success' | 'danger' | 'warning';
  active?: boolean;
  borderRadius?: 'sm' | 'md' | 'lg' | 'xl' | 'pill';
  size?: 'sm' | 'md' | 'lg';
}

export const NeumorphicButton: React.FC<ButtonProps> = ({
  children,
  variant = 'flat',
  active = false,
  borderRadius = 'md',
  size = 'md',
  className = '',
  style,
  type = 'button',
  ...props
}) => {
  const radiusClass = `var(--radius-${borderRadius})`;
  
  let padding = '10px 20px';
  let fontSize = '14px';
  if (size === 'sm') {
    padding = '6px 12px';
    fontSize = '12px';
  } else if (size === 'lg') {
    padding = '14px 28px';
    fontSize = '16px';
  }

  const baseStyle: React.CSSProperties = {
    borderRadius: radiusClass,
    padding,
    fontSize,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: 600,
    border: 'var(--border-width-hc) solid var(--border-high-contrast)',
    transition: 'all 0.15s ease',
    outline: 'none',
    ...style,
  };

  let classes = 'nm-button ';
  
  if (variant === 'primary') {
    classes = 'text-white ';
    baseStyle.background = 'var(--accent-blue-gradient)';
    baseStyle.color = 'var(--text-on-accent)';
    baseStyle.boxShadow = active 
      ? 'inset 3px 3px 6px rgba(0, 0, 0, 0.4)' 
      : '4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light)';
  } else if (variant === 'success') {
    classes = 'text-white ';
    baseStyle.background = 'var(--accent-green-gradient)';
    baseStyle.color = 'var(--text-on-accent)';
    baseStyle.boxShadow = active 
      ? 'inset 3px 3px 6px rgba(0, 0, 0, 0.4)' 
      : '4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light)';
  } else if (variant === 'danger') {
    classes = 'text-white ';
    baseStyle.background = 'var(--accent-red-gradient)';
    baseStyle.color = 'var(--text-on-accent)';
    baseStyle.boxShadow = active 
      ? 'inset 3px 3px 6px rgba(0, 0, 0, 0.4)' 
      : '4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light)';
  } else if (variant === 'warning') {
    classes = 'text-white ';
    baseStyle.background = 'var(--accent-orange)';
    baseStyle.color = 'var(--text-on-accent)';
    baseStyle.boxShadow = active 
      ? 'inset 3px 3px 6px rgba(0, 0, 0, 0.3)' 
      : '4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light)';
  } else if (variant === 'inset' || active) {
    classes = 'nm-inset ';
  }

  // Active state for gradient buttons on press/active
  const activeClass = active ? 'active' : '';

  return (
    <button
      type={type}
      className={`${classes} ${activeClass} ${className}`}
      style={baseStyle}
      {...props}
    >
      {children}
    </button>
  );
};
