import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, api, money } from '../api';
import CartRows from '../components/CartRows';
import Layout from '../components/Layout';
import { CartContext } from '../context/CartContext';

export default function Checkout() {
  const { cart, setCart } = useContext(CartContext), navigate = useNavigate();
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [deliveryArea, setDeliveryArea] = useState('inside-dhaka'), [paymentMethod, setPaymentMethod] = useState('cod');
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0), deliveryCharge = deliveryArea === 'inside-dhaka' ? 70 : 130, total = subtotal + deliveryCharge;
  async function submit(event) {
    event.preventDefault(); if (!cart.length) return; setBusy(true); setError('');
    try { const customer = Object.fromEntries(new FormData(event.currentTarget)); const order = await api('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer, deliveryArea, paymentMethod, items: cart.map(item => ({ productId: item._id, quantity: item.quantity })) }) }); setCart([]); window.open(`${API}${order.invoiceUrl}`, '_blank'); navigate('/thank-you'); }
    catch (reason) { setError(reason.message); } finally { setBusy(false); }
  }
  const options = [['cod', 'Cash on Delivery', 'Pay when your parcel arrives'], ['bkash', 'bKash', 'Pay after order confirmation'], ['nagad', 'Nagad', 'Pay after order confirmation']];
  return <Layout><main className="checkout"><section><p className="eyebrow">SECURE CHECKOUT</p><h1>Delivery details</h1><p className="checkout-intro">Complete your order and our team will confirm it by phone.</p><form onSubmit={submit}><input required name="name" placeholder="Full name *" /><input type="email" name="email" placeholder="Email address (optional)" /><input required name="phone" inputMode="tel" placeholder="Phone number *" /><textarea required name="address" placeholder="Full delivery address *" /><label className="field-label">Delivery area<select value={deliveryArea} onChange={event => setDeliveryArea(event.target.value)}><option value="inside-dhaka">Inside Dhaka — Tk 70</option><option value="outside-dhaka">Outside Dhaka — Tk 130</option></select></label><fieldset className="payment-options"><legend>Payment method</legend>{options.map(([value, title, note]) => <label key={value} className={paymentMethod === value ? 'selected' : ''}><input type="radio" checked={paymentMethod === value} onChange={() => setPaymentMethod(value)} /><span><b>{title}</b><small>{note}</small></span></label>)}</fieldset>{paymentMethod !== 'cod' && <p className="payment-notice">Payment details will be shared only after order confirmation. Never pay an unverified number.</p>}{error && <p className="error">{error}</p>}<button disabled={busy || !cart.length} className="button">{busy ? 'Placing order...' : `Place order · ${money(total)}`}</button></form></section><aside><p className="eyebrow">YOUR SELECTION</p><h2>Your bag</h2><CartRows /><div className="summary-row"><span>Subtotal</span><span>{money(subtotal)}</span></div><div className="summary-row"><span>Delivery</span><span>{money(deliveryCharge)}</span></div><div className="total"><b>Total</b><b>{money(total)}</b></div><p className="checkout-note">✦ Gift wrapping is included.</p></aside></main></Layout>;
}
