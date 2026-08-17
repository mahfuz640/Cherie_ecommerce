import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { CartContext } from '../context/CartContext';
import Brand from './Brand';
import './Announcement.css';

const defaultAnnouncement = { text: 'Complimentary gift wrapping on every Cherie order', visible: true };

export default function Layout({ children }) {
  const { count } = useContext(CartContext);
  const [announcement, setAnnouncement] = useState(defaultAnnouncement);
  useEffect(() => {
    let active = true;
    api('/api/collection-hero').then(settings => {
      if (active) setAnnouncement({ text: settings.announcementText || defaultAnnouncement.text, visible: settings.announcementVisible ?? defaultAnnouncement.visible });
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  return <>{announcement.visible && <div className="announcement announcement-scroll"><span className="announcement-track">{announcement.text}</span></div>}<header><Brand /><nav><Link to="/">Collection</Link><Link to="/checkout">Bag <span>{count}</span></Link><Link to="/admin/login">Admin</Link></nav></header>{children}<footer><div className="footer-grid"><div><Brand /><p>Jewellery made for your unforgettable moments.</p></div><div><h3>Customer care</h3><p>Personal styling<br />Gift-ready packaging<br />Secure local checkout</p></div><div><h3>Cherie promise</h3><p>Thoughtfully selected pieces for the women you love — including you.</p></div></div><small>Copyright {new Date().getFullYear()} Cherie. Beloved Always.</small></footer></>;
}
