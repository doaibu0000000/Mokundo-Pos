import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
  hideCloseButton?: boolean;
}

export const NeumorphicModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title = '',
  children,
  width = '480px',
  hideCloseButton = false,
}) => {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const currentModalId = 'modal_' + Date.now().toString() + Math.random().toString(36).substr(2, 5);
      window.history.pushState({ modalId: currentModalId }, '');

      const handlePopState = () => {
        if (window.history.state?.modalId === currentModalId) return;
        onCloseRef.current();
      };
      
      window.addEventListener('popstate', handlePopState);
      
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('popstate', handlePopState);
        if (window.history.state?.modalId === currentModalId) {
          window.history.back();
        }
      };
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
            }}
          />
          
          {/* Modal Dialog Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
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
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: title ? '20px' : '0px',
              }}
            >
              {title ? (
                <h3
                  style={{
                    fontWeight: 800,
                    fontSize: '18px',
                    color: 'var(--text-primary)',
                  }}
                >
                  {title}
                </h3>
              ) : <div />}
              
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
