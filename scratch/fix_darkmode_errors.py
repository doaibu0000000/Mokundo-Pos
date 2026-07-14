import os
import re

def fix_mobile():
    path = "src/app/layout-mobile/layout-mobile.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Remove Sun, Moon from lucide-react import
    content = content.replace("  Sun, Moon, LogOut", "  LogOut")
    
    # Remove isDarkMode, toggleDarkMode from useApp destructuring
    content = content.replace("    isDarkMode,\n    toggleDarkMode,\n", "")
    content = content.replace("    isDarkMode,\n    toggleDarkMode\n", "")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def fix_pengaturan():
    path = "src/modules/pengaturan/components/PengaturanView.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Check if isDarkMode is actually destructured inside PengaturanView
    # My previous script might have failed to replace it because it was inside `if (activeScreen === 'menu')`? No, useApp is at the top.
    # Let's just find `useApp()` and ensure we destructure them.
    # We will do this safely using regex
    
    destructure_match = re.search(r'const \{([^}]+)\} = useApp\(\);', content)
    if destructure_match:
        vars_str = destructure_match.group(1)
        vars_list = [v.strip() for v in vars_str.split(',')]
        if 'isDarkMode' not in vars_list:
            vars_list.append('isDarkMode')
            vars_list.append('toggleDarkMode')
            new_vars_str = ',\n    '.join(vars_list)
            content = content.replace(vars_str, f'\n    {new_vars_str}\n  ')
            
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def fix_web():
    path = "src/app/layout-web/layout-web.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Remove Sun, Moon from lucide-react import
    content = content.replace("  Sun, Moon, LogOut, Coffee as ShopIcon, Download", "  LogOut, Coffee as ShopIcon, Download")
    
    # Remove isDarkMode, toggleDarkMode from useApp destructuring
    # It might be in one line or multiple lines.
    content = re.sub(r'\s*isDarkMode,?', '', content)
    content = re.sub(r'\s*toggleDarkMode,?', '', content)
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

fix_mobile()
fix_pengaturan()
fix_web()
print("Done fixing")
