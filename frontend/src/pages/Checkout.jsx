import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, api, money } from '../api';
import CartRows from '../components/CartRows';
import Layout from '../components/Layout';
import { CartContext } from '../context/CartContext';

export default function Checkout() {
  const { cart, setCart } = useContext(CartContext), navigate = useNavigate(), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  async function submit(event) {
    event.preventDefault();
    if (!cart.length) return;
    setBusy(true); setError('');
    try {
      const customer = Object.fromEntries(new FormData(event.currentTarget));
      const order = await api('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer, items: cart.map(item => ({ productId: item._id, quantity: item.quantity })) }) });
      setCart([]); window.open(`${API}${order.invoiceUrl}`, '_blank'); navigate('/thank-you');
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }
  return <Layout><main className="checkout"><section><p className="eyebrow">SECURE CHECKOUT</p><h1>Your details</h1><p className="checkout-intro">Your Cherie piece will be prepared with care and your invoice will be ready to download after ordering.</p><form onSubmit={submit}><input required name="name" placeholder="Full name" /><input required type="email" name="email" placeholder="Email address" /><input required name="phone" placeholder="Phone number" /><textarea required name="address" placeholder="Delivery address" />{error && <p className="error">{error}</p>}<button disabled={busy || !cart.length} className="button">{busy ? 'Placing order...' : 'Place order & download invoice'}</button></form></section><aside><p className="eyebrow">YOUR SELECTION</p><h2>Your bag</h2><CartRows /><div className="total"><b>Total</b><b>{money(total)}</b></div><p className="checkout-note">✦ Gift wrapping is included with every order.</p></aside></main></Layout>;
}
