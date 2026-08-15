import { useEffect, useState } from 'react';
import { api } from '../api';
import Empty from '../components/Empty';
import Hero from '../components/Hero';
import Layout from '../components/Layout';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const [products, setProducts] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  useEffect(() => { api('/api/products').then(setProducts).catch(reason => setError(reason.message)).finally(() => setLoading(false)); }, []);
  return <Layout><Hero /><section className="service-strip"><div><span>✦</span><b>Gift-ready</b><small>Thoughtful wrapping, always</small></div><div><span>✦</span><b>Made for moments</b><small>Pieces to keep close</small></div><div><span>✦</span><b>Personal service</b><small>We are here to help you choose</small></div></section><main id="collection"><div className="section-title"><div><p className="eyebrow">THE CHERIE EDIT</p><h2>Find your sparkle</h2></div><p>{products.length} carefully chosen pieces</p></div>{loading ? <p>Loading collection...</p> : error ? <p className="error">{error}</p> : products.length ? <div className="grid">{products.map(product => <ProductCard key={product._id} product={product} />)}</div> : <Empty text="Your collection is ready for its first product. Sign in to Admin to add it." />}<section className="editorial"><div className="editorial-mark">C</div><div><p className="eyebrow">A LITTLE LUXURY, EVERY DAY</p><h2>Jewellery that feels like you.</h2><p>From a quiet everyday glow to a gift that says everything, Cherie celebrates the beauty in every woman and every moment.</p><a href="#collection" className="text-link">Explore the collection <span>→</span></a></div></section></main></Layout>;
}
