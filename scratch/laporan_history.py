import re

filepath = 'src/modules/laporan/components/LaporanView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace the history block
old_history_block = """  // --- Global History Back Logic for Popups ---
  const hasPopup = isDetailOpen || isVoidModalOpen;
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
        setIsDetailOpen(false);
        setIsVoidModalOpen(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  // ----------------------------------------------"""

new_history_block = """  // --- Sequential Modal History Logic ---
  useEffect(() => {
    if (isDetailOpen) window.history.pushState({ modal: 'detail' }, '');
  }, [isDetailOpen]);

  useEffect(() => {
    if (isVoidModalOpen) window.history.pushState({ modal: 'void' }, '');
  }, [isVoidModalOpen]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const stateModal = e.state?.modal;
      if (!stateModal) {
        setIsVoidModalOpen(false);
        setIsDetailOpen(false);
      } else if (stateModal === 'detail') {
        setIsVoidModalOpen(false);
        setIsDetailOpen(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  // ----------------------------------------"""
content = content.replace(old_history_block, new_history_block)

# 2. Update programmatic close calls
# For isDetailOpen = false -> window.history.back()
content = content.replace("onClose={() => setIsDetailOpen(false)}", "onClose={() => window.history.back()}")

# For isVoidModalOpen = false -> window.history.back()
content = content.replace("onClose={() => setIsVoidModalOpen(false)}", "onClose={() => window.history.back()}")
content = content.replace("onClick={() => setIsVoidModalOpen(false)}", "onClick={() => window.history.back()}")

# 3. For confirmVoidTransaction success: replace the dual setState with history.go(-2)
old_success = """      loadTransactions();
      setIsDetailOpen(false);
      setIsVoidModalOpen(false);
    } catch (error) {"""
new_success = """      loadTransactions();
      window.history.go(-2);
    } catch (error) {"""
content = content.replace(old_success, new_success)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated LaporanView history logic")
