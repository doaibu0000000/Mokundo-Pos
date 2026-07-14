import re

filepath = 'src/modules/pengaturan/components/PengaturanView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add navigateTo function and useEffect after activeScreen state
state_decl = "const [activeScreen, setActiveScreen] = useState<'menu' | 'profil' | 'printer' | 'keamanan' | 'sync' | 'shift'>('menu');"

new_logic = """const [activeScreen, setActiveScreen] = useState<'menu' | 'profil' | 'printer' | 'keamanan' | 'sync' | 'shift'>('menu');

  const navigateTo = (screen: 'menu' | 'profil' | 'printer' | 'keamanan' | 'sync' | 'shift') => {
    if (screen !== 'menu' && activeScreen === 'menu') {
      window.history.pushState({ screen }, '');
    }
    setActiveScreen(screen);
  };

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (activeScreen !== 'menu') {
        setActiveScreen('menu');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeScreen]);"""

content = content.replace(state_decl, new_logic)

# 2. Replace setActiveScreen calls in the menu clicks
content = content.replace("onClick={() => setActiveScreen('profil')}", "onClick={() => navigateTo('profil')}")
content = content.replace("onClick={() => setActiveScreen('printer')}", "onClick={() => navigateTo('printer')}")
content = content.replace("onClick={() => setActiveScreen('keamanan')}", "onClick={() => navigateTo('keamanan')}")
content = content.replace("onClick={() => setActiveScreen('sync')}", "onClick={() => navigateTo('sync')}")
content = content.replace("onClick={() => setActiveScreen('shift')}", "onClick={() => navigateTo('shift')}")

# 3. Replace the 'Kembali' button logic
content = content.replace("onClick={() => setActiveScreen('menu')}", "onClick={() => { window.history.back(); }}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Successfully added hardware back button support.")
