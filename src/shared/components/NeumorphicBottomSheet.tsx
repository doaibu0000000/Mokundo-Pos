import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const currentModalId = 'sheet_' + Date.now().toString() + Math.random().toString(36).substr(2, 5);
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
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(3px)',
            }}
          />
          
          {/* Drawer Card */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
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
              boxShadow: 'none',
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
                overflowY: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                paddingRight: '4px',
              }}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
