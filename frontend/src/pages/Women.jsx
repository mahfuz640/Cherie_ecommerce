import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import Empty from '../components/Empty';
import Hero from '../components/Hero';
import Layout from '../components/Layout';
import ProductCard from '../components/ProductCard';
import { storeUpdateAffects, useStoreUpdates } from '../realtime';

const coreCategories = ['All', 'Dresses', 'Tops', 'Bottoms', 'Co-ords', 'Abaya & Modest', 'Jewellery', 'Bags', 'Shoes', 'Beauty', 'Watches', 'Accessories'];
const categoryImageIndex = { Dresses: 0, Tops: 1, Bottoms: 2, 'Co-ords': 3, 'Abaya & Modest': 4, Jewellery: 5, Bags: 6, Shoes: 7, Beauty: 8, Watches: 9, Accessories: 10, All: 11 };

export default function Women() {
  const [products, setProducts] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [active, setActive] = useState('All');
  const load = useCallback((showLoading = true) => {
    if (showLoading) setLoading(true);
    return api('/api/products').then(data => { setProducts(data); setError(''); }).catch(reason => setError(reason.message)).finally(() => { if (showLoading) setLoading(false); });
  }, []);
  useEffect(() => { load(); }, [load]);
  useStoreUpdates(useCallback(update => { if (storeUpdateAffects(update, 'products')) load(false); }, [load]));
  const stored = [...new Set(products.map(product => product.category).filter(Boolean))];
  const categories = [...coreCategories, ...stored.filter(category => !coreCategories.some(item => item.toLowerCase() === category.toLowerCase()))];
  const visible = active === 'All' ? products : products.filter(product => product.category?.toLowerCase() === active.toLowerCase());
  return <Layout><Hero /><section className="service-strip"><div><span>✦</span><b>Gift-ready</b><small>Thoughtful wrapping, always</small></div><div><span>✦</span><b>Nationwide delivery</b><small>Across Bangladesh</small></div><div><span>✦</span><b>Secure checkout</b><small>COD, bKash and Nagad</small></div></section><main id="collection"><section className="category-section"><p className="eyebrow">SHOP FOR HER</p><h2>Everything she loves</h2><div className="category-tabs">{categories.map(category => { const imageIndex = categoryImageIndex[category] ?? 11; const column = imageIndex % 4, row = Math.floor(imageIndex / 4); return <button key={category} className={active === category ? 'active' : ''} onClick={() => setActive(category)} aria-pressed={active === category}><span className="category-image" style={{ '--category-x': `${column * 33.333333}%`, '--category-y': `${row * 50}%` }} /><b>{category}</b></button>; })}</div></section><div className="section-title"><div><p className="eyebrow">THE CHERIE EDIT</p><h2>{active === 'All' ? 'Find your style' : active}</h2></div><p>{visible.length} carefully chosen {visible.length === 1 ? 'piece' : 'pieces'}</p></div>{loading ? <p>Loading collection...</p> : error ? <p className="error">{error}</p> : visible.length ? <div className="grid">{visible.map(product => <ProductCard key={product._id} product={product} />)}</div> : <Empty text={`New ${active.toLowerCase()} pieces are coming soon.`} />}</main></Layout>;
}
