import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxHeight?: string;
}

export const NeumorphicBottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = '85vh',
}) => {
  const [animateShow, setAnimateShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Trigger animation frame
      setTimeout(() => setAnimateShow(true), 20);
    } else {
      document.body.style.overflow = 'unset';
      setAnimateShow(false);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(3px)',
          opacity: animateShow ? 1 : 0,
          transition: 'opacity 0.25s ease-out',
        }}
      />
      
      {/* Drawer Card */}
      <div
        className="nm-flat"
        style={{
          position: 'relative',
          width: '100%',
          maxHeight,
          borderTopLeftRadius: 'var(--radius-xl)',
          borderTopRightRadius: 'var(--radius-xl)',
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          border: 'var(--border-width-hc) solid var(--border-high-contrast)',
          padding: '16px 20px 24px 20px',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1001,
          transform: `translateY(${animateShow ? '0%' : '100%'})`,
          transition: 'transform 0.25s ease-out',
        }}
      >
        {/* Handle Bar (Drag Indicator) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '12px',
            cursor: 'pointer',
          }}
          onClick={onClose}
        >
          <div
            className="nm-inset"
            style={{
              width: '60px',
              height: '6px',
              borderRadius: 'var(--radius-pill)',
            }}
          />
        </div>

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <h3
            style={{
              fontWeight: 800,
              fontSize: '18px',
              color: 'var(--text-primary)',
            }}
          >
            {title}
          </h3>
          
          <button
            onClick={onClose}
            className="nm-button"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              color: 'var(--text-secondary)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content body */}
        <div
          style={{
            overflowY: 'auto',
            flex: 1,
            paddingRight: '4px',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
