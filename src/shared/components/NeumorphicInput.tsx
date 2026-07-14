import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
  borderRadius?: 'sm' | 'md' | 'lg' | 'xl' | 'pill';
  error?: boolean;
}

export const NeumorphicInput: React.FC<InputProps> = ({
  label,
  icon,
  type = 'text',
  containerClassName = '',
  containerStyle,
  borderRadius = 'md',
  error = false,
  className = '',
  id,
  style,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  
  const radiusClass = `var(--radius-${borderRadius})`;

  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    ...containerStyle,
  };

  const inputContainerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  };

  const inputStyle: React.CSSProperties = {
    borderRadius: radiusClass,
    padding: `12px ${isPassword ? '40px' : '16px'} 12px ${icon ? '40px' : '16px'}`,
    width: '100%',
    fontSize: '14px',
    border: `var(--border-width-hc) solid ${error ? 'var(--accent-red)' : 'var(--border-high-contrast)'}`,
    ...({ WebkitTextSecurity: (isPassword && !showPassword) ? 'disc' : 'none' } as any),
    ...style,
  };

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    left: '12px',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  };

  const toggleButtonStyle: React.CSSProperties = {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
  };

  return (
    <div className={containerClassName} style={wrapperStyle}>
      {label && (
        <label 
          htmlFor={id} 
          style={{
            display: 'block',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            marginBottom: '10px'
          }}
        >
          {label}
        </label>
      )}
      <div style={inputContainerStyle}>
        {icon && <div style={iconStyle}>{icon}</div>}
        
        <input
          id={id}
          type={isPassword ? 'text' : type}
          className={`nm-input transition-all-custom ${className}`}
          style={inputStyle}
          autoComplete="off"
          spellCheck="false"
          {...props}
        />
        
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={toggleButtonStyle}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
};
