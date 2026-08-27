import { useCallback, useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api';
import { CartContext } from '../context/CartContext';
import { storeUpdateAffects, useStoreUpdates } from '../realtime';
import Brand from './Brand';
import CartRows from './CartRows';
import './Announcement.css';
import './Navigation.css';

const fallback = { text: 'Complimentary gift wrapping on every Cherie order', visible: true };
export default function Layout({ children }) {
  const { cart, count } = useContext(CartContext), [cartOpen, setCartOpen] = useState(false), [announcement, setAnnouncement] = useState(fallback);
  const load = useCallback(() => api('/api/collection-hero').then(settings => setAnnouncement({ text: settings.announcementText || fallback.text, visible: settings.announcementVisible ?? fallback.visible })).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  useStoreUpdates(useCallback(update => { if (storeUpdateAffects(update, 'collectionHero')) load(); }, [load]));
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return <>{announcement.visible && <div className="announcement announcement-scroll"><span className="announcement-track">{announcement.text}</span></div>}<header><Brand /><nav><Link to="/#collection">Women</Link><button className="bag-button" onClick={() => setCartOpen(true)}>Bag <span>{count}</span></button><Link to="/admin/login">Admin</Link></nav></header>{cartOpen && <div className="cart-backdrop" onClick={() => setCartOpen(false)} />}<aside className={`cart-drawer ${cartOpen ? 'open' : ''}`} aria-hidden={!cartOpen}><div className="cart-drawer-head"><div><p className="eyebrow">YOUR SELECTION</p><h2>Shopping bag</h2></div><button onClick={() => setCartOpen(false)}>×</button></div><CartRows /><div className="drawer-total"><span>Subtotal</span><b>{money(total)}</b></div><p className="drawer-note">Delivery charge is calculated at checkout.</p><Link className={`button ${!cart.length ? 'disabled-link' : ''}`} to="/checkout" onClick={event => { if (!cart.length) event.preventDefault(); else setCartOpen(false); }}>Proceed to checkout</Link></aside>{children}<footer><div className="footer-grid"><div><Brand /><p>Style made for your unforgettable moments.</p></div><div className="footer-links"><h3>Information</h3><a href="#about-us">About Us</a><a href="#contact-us">Contact Us</a><Link to="/shipping-policy">Shipping Policy</Link><a href="#payment-policy">Payment Policy</a><Link to="/return-exchange">Return and Exchange</Link></div><div className="footer-links"><h3>Useful Links</h3><a href="#privacy-policy">Privacy Policy</a><a href="#terms-conditions">Terms and Conditions</a><a href="#size-guide">Size Guide</a><a href="#our-story">Our Story</a><a href="#faq">FAQ</a></div><div className="footer-contact" id="contact-us"><h3>Contact us</h3><a href="mailto:cheriebd2026@gmail.com">cheriebd2026@gmail.com</a><a href="tel:+8801570263453">01570263453</a><address>Mirpur, Dhaka Division, Bangladesh<br />Narayanganj, Dhaka Division, Bangladesh</address></div><div><h3>Secure payments</h3><p>Cash on Delivery · bKash · Nagad</p></div></div><small>Copyright {new Date().getFullYear()} Cherie. Beloved Always.</small></footer></>;
}
