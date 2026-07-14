import re

filepath = 'src/modules/produk/components/ProdukView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state variables
state_injection = """
  // Validation States
  const [productSubmitAttempted, setProductSubmitAttempted] = useState(false);
  const [categorySubmitAttempted, setCategorySubmitAttempted] = useState(false);
"""
if "productSubmitAttempted" not in content:
    content = content.replace("  // --- Global History Back Logic for Popups ---", state_injection + "\n  // --- Global History Back Logic for Popups ---")

# 2. Reset submitAttempted on open
if "setProductSubmitAttempted(false);" not in content:
    content = content.replace("setIsProductModalOpen(true);", "setProductSubmitAttempted(false);\n    setIsProductModalOpen(true);")

if "setCategorySubmitAttempted(false);" not in content:
    content = content.replace("setIsCategoryModalOpen(true);", "setCategorySubmitAttempted(false);\n    setIsCategoryModalOpen(true);")

# 3. Set submitAttempted on submit
if "setProductSubmitAttempted(true);" not in content:
    content = content.replace("const handleProductSubmit = async (e: React.FormEvent) => {\n    e.preventDefault();", "const handleProductSubmit = async (e: React.FormEvent) => {\n    e.preventDefault();\n    setProductSubmitAttempted(true);")

if "setCategorySubmitAttempted(true);" not in content:
    content = content.replace("const handleCategorySubmit = async (e: React.FormEvent) => {\n    e.preventDefault();", "const handleCategorySubmit = async (e: React.FormEvent) => {\n    e.preventDefault();\n    setCategorySubmitAttempted(true);")

# 4. Form noValidate
content = content.replace("<form onSubmit={handleProductSubmit}", "<form noValidate onSubmit={handleProductSubmit}")
content = content.replace("<form onSubmit={handleCategorySubmit}", "<form noValidate onSubmit={handleCategorySubmit}")

# 5. Replace 'required' with 'error' logic for each specific input.
# We will do simple string replacements for the exact blocks.

prodNama_before = """              <NeumorphicInput
                label="Nama Produk"
                placeholder="Masukkan nama"
                value={prodNama}
                onChange={(e) => setProdNama(e.target.value)}
                required
              />"""
prodNama_after = """              <NeumorphicInput
                label="Nama Produk"
                placeholder="Masukkan nama"
                value={prodNama}
                onChange={(e) => setProdNama(e.target.value)}
                error={productSubmitAttempted && !prodNama}
              />"""
content = content.replace(prodNama_before, prodNama_after)


prodHPP_before = """            <NeumorphicInput
              label="Harga Modal"
              type="number"
              placeholder="0"
              value={prodHPP}
              onChange={(e) => setProdHPP(e.target.value)}
              required
            />"""
prodHPP_after = """            <NeumorphicInput
              label="Harga Modal"
              type="number"
              placeholder="0"
              value={prodHPP}
              onChange={(e) => setProdHPP(e.target.value)}
              error={productSubmitAttempted && (!prodHPP || isNaN(parseFloat(prodHPP)))}
            />"""
content = content.replace(prodHPP_before, prodHPP_after)


prodHarga_before = """            <NeumorphicInput
              label="Harga Jual"
              type="number"
              placeholder="0"
              value={prodHarga}
              onChange={(e) => setProdHarga(e.target.value)}
              required
            />"""
prodHarga_after = """            <NeumorphicInput
              label="Harga Jual"
              type="number"
              placeholder="0"
              value={prodHarga}
              onChange={(e) => setProdHarga(e.target.value)}
              error={productSubmitAttempted && (!prodHarga || isNaN(parseFloat(prodHarga)))}
            />"""
content = content.replace(prodHarga_before, prodHarga_after)


prodSku_before = """            <NeumorphicInput
              label="Barcode"
              placeholder="Misal: 888001"
              value={prodSku}
              onChange={(e) => setProdSku(e.target.value)}
              required
            />"""
prodSku_after = """            <NeumorphicInput
              label="Barcode"
              placeholder="Misal: 888001"
              value={prodSku}
              onChange={(e) => setProdSku(e.target.value)}
              error={productSubmitAttempted && !prodSku}
            />"""
content = content.replace(prodSku_before, prodSku_after)


prodStok_before = """            <NeumorphicInput
              label="Jumlah Stok"
              type="number"
              placeholder="0"
              value={prodStok}
              onChange={(e) => setProdStok(e.target.value)}
              required
            />"""
prodStok_after = """            <NeumorphicInput
              label="Jumlah Stok"
              type="number"
              placeholder="0"
              value={prodStok}
              onChange={(e) => setProdStok(e.target.value)}
              error={productSubmitAttempted && (!prodStok || isNaN(parseInt(prodStok)))}
            />"""
content = content.replace(prodStok_before, prodStok_after)


catNama_before = """          <NeumorphicInput
            label="Nama Kategori"
            placeholder="Misal: Pasta, Dessert"
            value={catNama}
            onChange={(e) => setCatNama(e.target.value)}
            required
          />"""
catNama_after = """          <NeumorphicInput
            label="Nama Kategori"
            placeholder="Misal: Pasta, Dessert"
            value={catNama}
            onChange={(e) => setCatNama(e.target.value)}
            error={categorySubmitAttempted && !catNama}
          />"""
content = content.replace(catNama_before, catNama_after)


catUrutan_before = """          <NeumorphicInput
            label="Nomor Urutan Tampil"
            type="number"
            placeholder="1"
            value={catUrutan}
            onChange={(e) => setCatUrutan(e.target.value)}
            required
          />"""
catUrutan_after = """          <NeumorphicInput
            label="Nomor Urutan Tampil"
            type="number"
            placeholder="1"
            value={catUrutan}
            onChange={(e) => setCatUrutan(e.target.value)}
            error={categorySubmitAttempted && (!catUrutan || isNaN(parseInt(catUrutan)))}
          />"""
content = content.replace(catUrutan_before, catUrutan_after)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Validation script completed")
