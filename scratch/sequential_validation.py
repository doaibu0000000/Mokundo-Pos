import re

filepath = 'src/modules/produk/components/ProdukView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace states
old_states = """  const [productSubmitAttempted, setProductSubmitAttempted] = useState(false);
  const [categorySubmitAttempted, setCategorySubmitAttempted] = useState(false);"""
new_states = """  const [focusedErrorField, setFocusedErrorField] = useState<string | null>(null);
  const [focusedCatErrorField, setFocusedCatErrorField] = useState<string | null>(null);"""
content = content.replace(old_states, new_states)

# Replace resets
content = content.replace("setProductSubmitAttempted(false);", "setFocusedErrorField(null);")
content = content.replace("setCategorySubmitAttempted(false);", "setFocusedCatErrorField(null);")

# Update handleProductSubmit
old_submit_start = """  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductSubmitAttempted(true);
    setProdError('');

    const harga = parseFloat(prodHarga);
    const HPP = parseFloat(prodHPP);
    const stok = parseInt(prodStok);
    const threshold = parseInt(prodThreshold);

    if (!prodNama || isNaN(harga) || isNaN(HPP) || isNaN(stok) || isNaN(threshold) || !prodSku) {
      return;
    }"""
new_submit_start = """  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProdError('');

    const harga = parseFloat(prodHarga);
    const HPP = parseFloat(prodHPP);
    const stok = parseInt(prodStok);
    const threshold = parseInt(prodThreshold);

    if (!prodNama) {
      setFocusedErrorField('nama');
      return;
    }
    if (prodHPP === '' || isNaN(HPP)) {
      setFocusedErrorField('hpp');
      return;
    }
    if (prodHarga === '' || isNaN(harga)) {
      setFocusedErrorField('harga');
      return;
    }
    if (!prodSku) {
      setFocusedErrorField('sku');
      return;
    }
    if (prodStok === '' || isNaN(stok)) {
      setFocusedErrorField('stok');
      return;
    }
    setFocusedErrorField(null);"""
content = content.replace(old_submit_start, new_submit_start)

# Update handleCategorySubmit
old_cat_start = """  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategorySubmitAttempted(true);
    setCatError('');

    const urutan = parseInt(catUrutan);
    if (!catNama || isNaN(urutan)) {
      return;
    }"""
new_cat_start = """  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatError('');

    const urutan = parseInt(catUrutan);
    if (!catNama) {
      setFocusedCatErrorField('nama');
      return;
    }
    if (catUrutan === '' || isNaN(urutan)) {
      setFocusedCatErrorField('urutan');
      return;
    }
    setFocusedCatErrorField(null);"""
content = content.replace(old_cat_start, new_cat_start)

# Update error props
content = content.replace("error={productSubmitAttempted && !prodNama}", "error={focusedErrorField === 'nama'}")
content = content.replace("error={productSubmitAttempted && (!prodHPP || isNaN(parseFloat(prodHPP)))}", "error={focusedErrorField === 'hpp'}")
content = content.replace("error={productSubmitAttempted && (!prodHarga || isNaN(parseFloat(prodHarga)))}", "error={focusedErrorField === 'harga'}")
content = content.replace("error={productSubmitAttempted && !prodSku}", "error={focusedErrorField === 'sku'}")
content = content.replace("error={productSubmitAttempted && (!prodStok || isNaN(parseInt(prodStok)))}", "error={focusedErrorField === 'stok'}")

content = content.replace("error={categorySubmitAttempted && !catNama}", "error={focusedCatErrorField === 'nama'}")
content = content.replace("error={categorySubmitAttempted && (!catUrutan || isNaN(parseInt(catUrutan)))}", "error={focusedCatErrorField === 'urutan'}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated to sequential validation")
