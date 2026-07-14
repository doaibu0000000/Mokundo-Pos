import os
import re

def clean_appcontext():
    path = "src/store/AppContext.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    content = re.sub(r'\s*isHighContrast:\s*boolean;', '', content)
    content = re.sub(r'\s*toggleHighContrast:\s*\(\)\s*=>\s*void;', '', content)
    content = re.sub(r'\s*const \[isHighContrast,\s*setIsHighContrast\]\s*=\s*useState<boolean>\(false\);', '', content)
    content = re.sub(r'\s*if\s*\(isHighContrast\)\s*html\.classList\.add\(\'high-contrast\'\);\s*else\s*html\.classList\.remove\(\'high-contrast\'\);', '', content)
    content = re.sub(r'\s*const toggleHighContrast\s*=\s*\(\)\s*=>\s*setIsHighContrast\(prev\s*=>\s*!prev\);', '', content)
    
    # Remove from context value
    content = re.sub(r'\s*isHighContrast,', '', content)
    content = re.sub(r'\s*toggleHighContrast,', '', content)
    
    # Also fix the dependency array for useEffect
    content = content.replace("  }, [isHighContrast]);", "  }, []);")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def clean_pengaturan():
    path = "src/modules/pengaturan/components/PengaturanView.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Remove destructuring
    content = re.sub(r'\s*isHighContrast,', '', content)
    content = re.sub(r'\s*toggleHighContrast,', '', content)
    
    # Remove UI block 1
    ui_regex = r'<div style=\{\{\s*display:\s*\'flex\',\s*justifyContent:\s*\'space-between\',\s*alignItems:\s*\'center\',\s*padding:\s*\'8px 0\'\s*\}\}>\s*<span style=\{\{\s*fontSize:\s*\'13px\'\s*\}\}>Mode Kontras Tinggi</span>\s*<NeumorphicButton\s*size="sm"\s*active=\{isHighContrast\}\s*onClick=\{toggleHighContrast\}\s*>\s*\{isHighContrast\s*\?\s*\'ON\'\s*:\s*\'OFF\'\}\s*</NeumorphicButton>\s*</div>'
    content = re.sub(ui_regex, '', content, flags=re.MULTILINE)
    
    # Remove UI block 2
    ui_regex2 = r'<div style=\{\{\s*display:\s*\'flex\',\s*justifyContent:\s*\'space-between\',\s*alignItems:\s*\'center\',\s*padding:\s*\'8px 0\',\s*borderBottom:\s*\'1px dashed var\(--text-muted\)\'\s*\}\}>\s*<span style=\{\{\s*fontSize:\s*\'13px\'\s*\}\}>Mode Kontras Tinggi</span>\s*<NeumorphicButton\s*size="sm"\s*active=\{isHighContrast\}\s*onClick=\{toggleHighContrast\}\s*>\s*\{isHighContrast\s*\?\s*\'ON\'\s*:\s*\'OFF\'\}\s*</NeumorphicButton>\s*</div>'
    content = re.sub(ui_regex2, '', content, flags=re.MULTILINE)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

clean_appcontext()
clean_pengaturan()
print("Cleaned high contrast")
