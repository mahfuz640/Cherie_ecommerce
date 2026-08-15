import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import Brand from './Brand';

export default function Layout({ children }) {
  const { count } = useContext(CartContext);
  return <><div className="announcement">Complimentary gift wrapping on every Cherie order</div><header><Brand /><nav><Link to="/">Collection</Link><Link to="/checkout">Bag <span>{count}</span></Link><Link to="/admin/login">Admin</Link></nav></header>{children}<footer><div className="footer-grid"><div><Brand /><p>Jewellery made for your unforgettable moments.</p></div><div><h3>Customer care</h3><p>Personal styling<br />Gift-ready packaging<br />Secure local checkout</p></div><div><h3>Cherie promise</h3><p>Thoughtfully selected pieces for the women you love — including you.</p></div></div><small>Copyright {new Date().getFullYear()} Cherie. Beloved Always.</small></footer></>;
}
