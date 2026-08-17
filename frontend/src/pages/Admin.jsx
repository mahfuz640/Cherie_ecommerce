import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiImg } from '../api';
import CarouselForm from '../components/admin/CarouselForm';
import CollectionHeroForm from '../components/admin/CollectionHeroForm';
import { OrderList, ProductList } from '../components/admin/AdminLists';
import ProductForm from '../components/admin/ProductForm';
import Brand from '../components/Brand';

export default function Admin() {
  const token = localStorage.getItem('cherie-token'), navigate = useNavigate();
  const [products, setProducts] = useState([]), [orders, setOrders] = useState([]), [slides, setSlides] = useState([]), [collectionHero, setCollectionHero] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null), [editingSlide, setEditingSlide] = useState(null);
  const [productImage, setProductImage] = useState(''), [slideImage, setSlideImage] = useState(''), [notice, setNotice] = useState(''), [error, setError] = useState('');
  const auth = { Authorization: `Bearer ${token}` }, jsonAuth = { ...auth, 'Content-Type': 'application/json' };
  async function load() {
    try {
      const [productData, orderData, slideData, heroData] = await Promise.all([api('/api/products'), api('/api/orders', { headers: auth }), api('/api/carousel'), api('/api/collection-hero')]);
      setProducts(productData); setOrders(orderData); setSlides(slideData); setCollectionHero(heroData);
    } catch (reason) { setError(reason.message); }
  }
  useEffect(() => { if (!token) navigate('/admin/login'); else load(); }, [token]);
  async function upload(file, setter) {
    if (!file) return;
    setError('');
    try { const form = new FormData(); form.append('image', file); const result = await api('/api/upload', { method: 'POST', headers: auth, body: form }); setter(result.url); setNotice('Image uploaded.'); }
    catch (reason) { setError(reason.message); }
  }
  async function saveProduct(event) {
    event.preventDefault(); setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const payload = { ...values, price: Number(values.price), stock: Number(values.stock), featured: values.featured === 'on', images: productImage ? [productImage] : editingProduct?.images || [] };
    delete payload.image;
    try {
      await api(`/api/products${editingProduct ? `/${editingProduct._id}` : ''}`, { method: editingProduct ? 'PATCH' : 'POST', headers: jsonAuth, body: JSON.stringify(payload) });
      setNotice(editingProduct ? 'Product updated.' : 'Product added.'); setEditingProduct(null); setProductImage(''); event.currentTarget.reset(); await load();
    } catch (reason) { setError(reason.message); }
  }
  async function deleteProduct(product) {
    if (!window.confirm(`Remove ${product.name}?`)) return;
    try { await api(`/api/products/${product._id}`, { method: 'DELETE', headers: auth }); setProducts(current => current.filter(item => item._id !== product._id)); setNotice(`${product.name} removed.`); }
    catch (reason) { setError(reason.message); }
  }
  async function saveSlide(event) {
    event.preventDefault(); setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api(`/api/carousel${editingSlide ? `/${editingSlide._id}` : ''}`, { method: editingSlide ? 'PATCH' : 'POST', headers: jsonAuth, body: JSON.stringify({ ...values, image: slideImage }) });
      setNotice(editingSlide ? 'Carousel slide updated.' : 'Carousel image added.'); setEditingSlide(null); setSlideImage(''); event.currentTarget.reset(); await load();
    } catch (reason) { setError(reason.message); }
  }
  async function deleteSlide(slide) {
    if (!window.confirm('Remove this carousel image?')) return;
    try { await api(`/api/carousel/${slide._id}`, { method: 'DELETE', headers: auth }); setSlides(current => current.filter(item => item._id !== slide._id)); setNotice('Carousel image removed.'); }
    catch (reason) { setError(reason.message); }
  }
  async function saveCollectionHero(event) {
    event.preventDefault(); setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const updated = await api('/api/collection-hero', { method: 'PATCH', headers: jsonAuth, body: JSON.stringify({ ...values, visible: values.visible === 'on' }) });
      setCollectionHero(updated); setNotice(updated.visible ? 'Collection message updated and visible.' : 'Collection message updated and hidden.');
    } catch (reason) { setError(reason.message); }
  }
  async function changeStatus(order, status) {
    try { const updated = await api(`/api/orders/${order._id}/status`, { method: 'PATCH', headers: jsonAuth, body: JSON.stringify({ status }) }); setOrders(current => current.map(item => item._id === updated._id ? updated : item)); }
    catch (reason) { setError(reason.message); }
  }
  if (!token) return null;
  const startEditProduct = product => { setEditingProduct(product); setProductImage(product.images?.[0] || ''); };
  const startEditSlide = slide => { setEditingSlide(slide); setSlideImage(slide.image); };
  return <main className="admin"><div className="admin-top"><Brand /><button onClick={() => { localStorage.removeItem('cherie-token'); navigate('/'); }}>Sign out</button></div><p className="eyebrow">DASHBOARD</p><h1>Manage collection</h1>{notice && <p className="notice">{notice}</p>}{error && <p className="error">{error}</p>}<CollectionHeroForm settings={collectionHero} onSave={saveCollectionHero} /><ProductForm editing={editingProduct} image={productImage} onImageChange={setProductImage} onUpload={file => upload(file, setProductImage)} onSave={saveProduct} onCancel={() => { setEditingProduct(null); setProductImage(''); }} /><CarouselForm editing={editingSlide} image={slideImage} onImageChange={setSlideImage} onUpload={file => upload(file, setSlideImage)} onSave={saveSlide} onCancel={() => { setEditingSlide(null); setSlideImage(''); }} slides={slides} onEdit={startEditSlide} onDelete={deleteSlide} apiImg={apiImg} /><ProductList products={products} onEdit={startEditProduct} onDelete={deleteProduct} /><OrderList orders={orders} onStatusChange={changeStatus} /></main>;
}
