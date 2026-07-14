import os

def update_mobile():
    path = "src/app/layout-mobile/layout-mobile.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    old_block = """          </div>

          <NeumorphicButton 
            onClick={toggleDarkMode}
            style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0 }}
          >
            {isDarkMode ? <Sun size={18} color="var(--accent-orange)" /> : <Moon size={18} />}
          </NeumorphicButton>
        </div>"""
    new_block = """          </div>
        </div>"""
    
    content = content.replace(old_block, new_block)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def update_web():
    path = "src/app/layout-web/layout-web.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    old_block = """        {/* Sidebar Footer theme configurations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px dashed var(--text-muted)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Dark Mode toggle */}
            <NeumorphicButton
              onClick={toggleDarkMode}
              style={{ flex: 1, padding: '8px 0' }}
            >
              {isDarkMode ? <Sun size={16} color="var(--accent-orange)" /> : <Moon size={16} />}
              <span style={{ fontSize: '11px', marginLeft: '4px' }}>{isDarkMode ? 'Light' : 'Dark'}</span>
            </NeumorphicButton>

            {/* High Contrast toggle */}
            <NeumorphicButton
              active={isHighContrast}
              onClick={toggleHighContrast}
              style={{ flex: 1, padding: '8px 0', fontSize: '11px' }}
            >
              ♿ HC
            </NeumorphicButton>
          </div>
        </div>
      </nav>"""
    new_block = """      </nav>"""
    
    content = content.replace(old_block, new_block)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def update_pengaturan():
    path = "src/modules/pengaturan/components/PengaturanView.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Import
    content = content.replace(
        "import { Settings, Key, Cloud, FolderLock, Power, AlertTriangle, Download, Upload } from 'lucide-react';",
        "import { Settings, Key, Cloud, FolderLock, Power, AlertTriangle, Download, Upload, Sun, Moon } from 'lucide-react';"
    )
    
    # Destructuring useApp
    content = content.replace(
        "    isHighContrast,\n    toggleHighContrast\n  } = useApp();",
        "    isHighContrast,\n    toggleHighContrast,\n    isDarkMode,\n    toggleDarkMode\n  } = useApp();"
    )
    
    # Adding Dark Mode UI
    old_ui = """            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed var(--text-muted)' }}>
              <span style={{ fontSize: '13px' }}>Mode Kontras Tinggi</span>"""
    
    new_ui = """            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed var(--text-muted)' }}>
              <span style={{ fontSize: '13px' }}>Mode Gelap (Dark Mode)</span>
              <NeumorphicButton 
                size="sm"
                active={isDarkMode}
                onClick={toggleDarkMode}
                style={{ padding: '6px 12px' }}
              >
                {isDarkMode ? <Sun size={14} color="var(--accent-orange)" /> : <Moon size={14} />}
                <span style={{ marginLeft: '6px' }}>{isDarkMode ? 'ON' : 'OFF'}</span>
              </NeumorphicButton>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed var(--text-muted)' }}>
              <span style={{ fontSize: '13px' }}>Mode Kontras Tinggi</span>"""
              
    content = content.replace(old_ui, new_ui)
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


update_mobile()
update_web()
update_pengaturan()
print("Done updating")
