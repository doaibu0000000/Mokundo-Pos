import re

filepath = 'src/modules/transaksi/components/TransaksiView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state
old_state = "  const [checkoutError, setCheckoutError] = useState('');"
new_state = "  const [checkoutError, setCheckoutError] = useState('');\n  const [paymentSubmitAttempted, setPaymentSubmitAttempted] = useState(false);"
content = content.replace(old_state, new_state)

# 2. Add reset when opening modal
old_open = "setIsPaymentOpen(true);"
new_open = "setPaymentSubmitAttempted(false);\n              setIsPaymentOpen(true);"
content = content.replace(old_open, new_open)

# 3. Update handleCheckoutSubmit
old_submit = """  const handleCheckoutSubmit = async () => {
    setCheckoutError('');

    // Validations
    if (cart.length === 0) return;
    if (paymentMethod === 'Tunai' && (parseFloat(cashPaid) || 0) < cartTotals.total) {
      setCheckoutError('Uang tunai dibayarkan kurang dari total belanja');
      return;
    }"""
new_submit = """  const handleCheckoutSubmit = async () => {
    setPaymentSubmitAttempted(true);
    setCheckoutError('');

    // Validations
    if (cart.length === 0) return;
    if (paymentMethod === 'Tunai' && (parseFloat(cashPaid) || 0) < cartTotals.total) {
      return;
    }"""
content = content.replace(old_submit, new_submit)

# 4. Update NeumorphicInput for cashPaid
old_input = """              <NeumorphicInput
                label="Uang Dibayar (Rp)"
                placeholder="0"
                type="number"
                value={cashPaid}
                onChange={(e) => setCashPaid(e.target.value)}
                autoFocus
              />"""
new_input = """              <NeumorphicInput
                label="Uang Dibayar (Rp)"
                placeholder="0"
                type="number"
                value={cashPaid}
                onChange={(e) => setCashPaid(e.target.value)}
                autoFocus
                error={paymentSubmitAttempted && (parseFloat(cashPaid) || 0) < cartTotals.total}
              />"""
content = content.replace(old_input, new_input)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated payment validation")
