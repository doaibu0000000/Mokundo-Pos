import re

filepath = 'src/modules/produk/components/ProdukView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

hook_code = """
  // --- Global History Back Logic for Popups ---
  const hasPopup = isProductModalOpen || isCropModalOpen || isCategoryModalOpen || confirmConfig.isOpen;
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
    const handlePopState = () => {
      if (prevHasPopup.current) {
        setIsProductModalOpen(false);
        setIsCropModalOpen(false);
        setIsCategoryModalOpen(false);
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  // ----------------------------------------------
"""

target = """  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, message: string, onConfirm: () => void}>({
    isOpen: false, 
    message: '', 
    onConfirm: () => {}
  });"""

replacement = target + "\n" + hook_code

if target in content and "// --- Global History Back Logic for Popups ---" not in content:
    content = content.replace(target, replacement, 1)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Injected into ProdukView")
else:
    print("Target not found or already injected")
