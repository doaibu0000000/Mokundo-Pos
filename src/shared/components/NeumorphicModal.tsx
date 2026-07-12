import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
  hideCloseButton?: boolean;
}

export const NeumorphicModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = '480px',
  hideCloseButton = false,
}) => {
  const [animateShow, setAnimateShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
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
        height: '100dvh',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
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
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          opacity: animateShow ? 1 : 0,
          transition: 'opacity 0.2s ease-out',
        }}
      />
      
      {/* Modal Dialog Card */}
      <div
        className="nm-flat"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: width,
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1001,
          boxShadow: 'none',
          transform: `scale(${animateShow ? 1 : 0.9})`,
          opacity: animateShow ? 1 : 0,
          transition: 'transform 0.2s ease-out, opacity 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
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
          
          {!hideCloseButton && (
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
          )}
        </div>

        {/* Content body */}
        <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '12px', margin: '-12px' }}>
          {children}
        </div>
      </div>
    </div>
  );
};
