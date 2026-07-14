import re

def inject_history_logic(filepath, has_popup_expr, close_calls, target_insert_after):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    hook_code = f"""
  // --- Global History Back Logic for Popups ---
  const hasPopup = {has_popup_expr};
  const prevHasPopup = React.useRef(false);

  useEffect(() => {{
    if (hasPopup && !prevHasPopup.current) {{
      window.history.pushState({{ popupOpen: true }}, '');
      prevHasPopup.current = true;
    }} else if (!hasPopup && prevHasPopup.current) {{
      prevHasPopup.current = false;
      setTimeout(() => {{
        if (window.history.state?.popupOpen) {{
          window.history.back();
        }}
      }}, 50);
    }}
  }}, [hasPopup]);

  useEffect(() => {{
    const handlePopState = () => {{
      if (prevHasPopup.current) {{
{close_calls}
      }}
    }};
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }}, []);
  // ----------------------------------------------
"""

    replacement = target_insert_after + "\n" + hook_code
    
    if target_insert_after in content and "// --- Global History Back Logic for Popups ---" not in content:
        content = content.replace(target_insert_after, replacement, 1)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Injected into {filepath}")
    else:
        print(f"Failed to inject or already injected into {filepath}")

# ProdukView
produk_has_popup = "isProductModalOpen || isCropModalOpen || isCategoryModalOpen || confirmConfig.isOpen"
produk_close_calls = """        setIsProductModalOpen(false);
        setIsCropModalOpen(false);
        setIsCategoryModalOpen(false);
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));"""
produk_target = "const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, message: string, onConfirm: () => void}>({"
# Wait, the target is split over multiple lines. Let's use a simpler target.
produk_target_simple = "  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, message: string, onConfirm: () => void}>({\n    isOpen: false,\n    message: '',\n    onConfirm: () => {}\n  });"

# LaporanView
laporan_has_popup = "isDetailOpen"
laporan_close_calls = """        setIsDetailOpen(false);"""
laporan_target = "  const [isDetailOpen, setIsDetailOpen] = useState(false);"

inject_history_logic(
    'src/modules/produk/components/ProdukView.tsx', 
    produk_has_popup, 
    produk_close_calls, 
    produk_target_simple
)

inject_history_logic(
    'src/modules/laporan/components/LaporanView.tsx', 
    laporan_has_popup, 
    laporan_close_calls, 
    laporan_target
)
