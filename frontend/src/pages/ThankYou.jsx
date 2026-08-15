import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

export default function ThankYou() {
  return <Layout><main className="center"><p className="eyebrow">ORDER RECEIVED</p><h1>Thank you for choosing Cherie.</h1><p>Your order is being lovingly prepared. Your invoice opened in a new tab.</p><Link className="button" to="/">Return to collection</Link></main></Layout>;
}
