import re

filepath = 'src/modules/transaksi/components/TransaksiView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

hook_code = """
  // --- Global History Back Logic for Popups ---
  const hasPopup = isCartOpen || isPaymentOpen || !!variantProduct || !!completedTx;
  const prevHasPopup = React.useRef(false);

  useEffect(() => {
    if (hasPopup && !prevHasPopup.current) {
      window.history.pushState({ popupOpen: true }, '');
      prevHasPopup.current = true;
    } else if (!hasPopup && prevHasPopup.current) {
      prevHasPopup.current = false;
      setTimeout(() => {
        if (window.history.state?.popupOpen) {
          window.history.back();
        }
      }, 50);
    }
  }, [hasPopup]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (prevHasPopup.current) {
        setIsPaymentOpen(false);
        setIsCartOpen(false);
        setVariantProduct(null);
        setCompletedTx(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  // ----------------------------------------------
"""

target = "const [wakeLockStatus, setWakeLockStatus] = useState<'Active' | 'Inactive' | 'Unsupported'>('Inactive');"
replacement = target + "\n" + hook_code

content = content.replace(target, replacement)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
