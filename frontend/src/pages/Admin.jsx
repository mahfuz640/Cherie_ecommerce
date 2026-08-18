import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, apiImg } from '../api';
import { clearAdminSession, getAdminToken, hasActiveAdminSession } from '../adminSession';
import { storeUpdateAffects, useStoreUpdates } from '../realtime';
import AnnouncementForm from '../components/admin/AnnouncementForm';
import CarouselForm from '../components/admin/CarouselForm';
import CarouselSettingsForm from '../components/admin/CarouselSettingsForm';
import CollectionHeroForm from '../components/admin/CollectionHeroForm';
import { OrderList, ProductList } from '../components/admin/AdminLists';
import ProductForm from '../components/admin/ProductForm';
import Brand from '../components/Brand';
import './Admin.css';
import './AdminToast.css';

const carouselSettingsFallback = { autoSlideSeconds: 5, fixedSlideId: null, transitionEffect: 'fade', transitionDurationMs: 800 };

export default function Admin() {
  const token = getAdminToken(), navigate = useNavigate();
  const [products, setProducts] = useState([]), [orders, setOrders] = useState([]), [slides, setSlides] = useState([]), [collectionHero, setCollectionHero] = useState(null), [carouselSettings, setCarouselSettings] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null), [editingSlide, setEditingSlide] = useState(null);
  const [productImage, setProductImage] = useState(''), [slideImage, setSlideImage] = useState(''), [removeProductImage, setRemoveProductImage] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState(''), [toastKey, setToastKey] = useState(0);
  const ownStoreUpdateUntil = useRef(0), realtimeReloadTimer = useRef();
  const auth = { Authorization: `Bearer ${token}` }, jsonAuth = { ...auth, 'Content-Type': 'application/json' };
  const clearToast = () => { setNotice(''); setError(''); };
  const showNotice = message => { setError(''); setNotice(message); setToastKey(current => current + 1); };
  const showError = reason => { setNotice(''); setError(reason?.message || 'Something went wrong. Please try again.'); setToastKey(current => current + 1); };
  const suppressOwnStoreUpdate = () => { ownStoreUpdateUntil.current = Date.now() + 1500; };
  async function load() {
    try {
      const [productData, orderData, slideData, heroData, carouselSettingsData] = await Promise.all([api('/api/products'), api('/api/orders', { headers: auth }), api('/api/carousel'), api('/api/collection-hero'), api('/api/carousel/settings').catch(() => carouselSettingsFallback)]);
      setProducts(productData); setOrders(orderData); setSlides(slideData); setCollectionHero(heroData); setCarouselSettings(carouselSettingsData);
    } catch (reason) {
      if (reason.status === 401) {
        clearAdminSession();
        navigate('/admin/login', { replace: true });
        return;
      }
      showError(reason);
    }
  }
  useEffect(() => {
    if (!hasActiveAdminSession()) {
      navigate('/admin/login', { replace: true });
      return;
    }
    load();
  }, [token]);
  useStoreUpdates(update => {
    if (!token || !storeUpdateAffects(update, 'products', 'orders', 'carousel', 'carouselSettings', 'collectionHero')) return;
    if (Date.now() < ownStoreUpdateUntil.current) return;
    window.clearTimeout(realtimeReloadTimer.current);
    realtimeReloadTimer.current = window.setTimeout(() => {
      realtimeReloadTimer.current = undefined;
      load();
    }, 250);
  });
  useEffect(() => () => window.clearTimeout(realtimeReloadTimer.current), []);
  useEffect(() => {
    if (!notice && !error) return undefined;
    const timeout = window.setTimeout(clearToast, error ? 6500 : 4200);
    return () => window.clearTimeout(timeout);
  }, [notice, error, toastKey]);
  async function uploadImage(file) {
    suppressOwnStoreUpdate();
    const form = new FormData();
    form.append('image', file);
    return api('/api/upload', { method: 'POST', headers: auth, body: form });
  }
  async function upload(file, setter) {
    if (!file) return;
    clearToast();
    try { const result = await uploadImage(file); setter(result.url); showNotice('Image uploaded.'); }
    catch (reason) { showError(reason); }
  }
  async function saveProduct(event) {
    event.preventDefault(); clearToast();
    suppressOwnStoreUpdate();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const payload = { ...values, price: Number(values.price), stock: Number(values.stock), featured: values.featured === 'on', images: removeProductImage ? [] : (productImage ? [productImage] : editingProduct?.images || []) };
    delete payload.image;
    try {
      await api(`/api/products${editingProduct ? `/${editingProduct._id}` : ''}`, { method: editingProduct ? 'PATCH' : 'POST', headers: jsonAuth, body: JSON.stringify(payload) });
      showNotice(editingProduct ? 'Product updated.' : 'Product added.'); setEditingProduct(null); setProductImage(''); setRemoveProductImage(false); event.currentTarget.reset(); await load();
    } catch (reason) { showError(reason); }
  }
  async function deleteProduct(product) {
    if (!window.confirm(`Remove ${product.name}?`)) return;
    suppressOwnStoreUpdate();
    try { await api(`/api/products/${product._id}`, { method: 'DELETE', headers: auth }); setProducts(current => current.filter(item => item._id !== product._id)); showNotice(`${product.name} removed.`); }
    catch (reason) { showError(reason); }
  }
  async function saveSlide(event, batchFiles) {
    event.preventDefault();
    clearToast();
    suppressOwnStoreUpdate();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));

    if (editingSlide) {
      try {
        await api(`/api/carousel/${editingSlide._id}`, { method: 'PATCH', headers: jsonAuth, body: JSON.stringify({ ...values, image: slideImage }) });
        showNotice('Carousel slide updated.'); setEditingSlide(null); setSlideImage(''); form.reset(); await load();
      } catch (reason) { showError(reason); }
      return;
    }

    const files = batchFiles || [];
    if (!files.length) {
      showError(new Error('Choose at least one carousel image first.'));
      return;
    }

    const added = [];
    const pending = [];
    let lastFailure;
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        try {
          const uploaded = await uploadImage(file);
          const created = await api('/api/carousel', { method: 'POST', headers: jsonAuth, body: JSON.stringify({ ...values, image: uploaded.url }) });
          added.push(created);
        } catch (reason) {
          lastFailure = reason;
          pending.push(file);
          if (reason.status === 401 || reason.status === 403) {
            pending.push(...files.slice(index + 1));
            break;
          }
        }
      }

      if (added.length) setSlides(current => [...added].reverse().concat(current));
      if (!pending.length) {
        setSlideImage('');
        form.reset();
        showNotice(`${added.length} carousel image${added.length === 1 ? '' : 's'} added.`);
      } else {
        const addedText = added.length ? `${added.length} carousel image${added.length === 1 ? '' : 's'} added. ` : '';
        const pendingText = `${pending.length} image${pending.length === 1 ? '' : 's'} remain selected for a safe retry.`;
        showError(new Error(`${addedText}${pendingText} ${lastFailure?.message || 'Please try again.'}`));
      }
      return pending;
    } catch (reason) {
      showError(reason);
      return files;
    }
  }
  async function deleteSlide(slide) {
    if (!window.confirm('Remove this carousel image?')) return;
    suppressOwnStoreUpdate();
    try { await api(`/api/carousel/${slide._id}`, { method: 'DELETE', headers: auth }); setSlides(current => current.filter(item => item._id !== slide._id)); setCarouselSettings(current => current?.fixedSlideId === slide._id ? { ...current, fixedSlideId: null } : current); if (editingSlide?._id === slide._id) { setEditingSlide(null); setSlideImage(''); } showNotice('Carousel image removed. Fixed mode was cleared if this was the selected image.'); }
    catch (reason) { showError(reason); }
  }
  async function saveCollectionHero(event) {
    event.preventDefault(); clearToast();
    suppressOwnStoreUpdate();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const updated = await api('/api/collection-hero', { method: 'PATCH', headers: jsonAuth, body: JSON.stringify({ ...values, visible: values.visible === 'on' }) });
      setCollectionHero(updated); showNotice(updated.visible ? 'Collection message updated and visible.' : 'Collection message updated and hidden.');
    } catch (reason) { showError(reason); }
  }
  async function saveAnnouncement(event) {
    event.preventDefault(); clearToast();
    suppressOwnStoreUpdate();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const updated = await api('/api/collection-hero', { method: 'PATCH', headers: jsonAuth, body: JSON.stringify({ announcementText: values.announcementText, announcementVisible: values.announcementVisible === 'on' }) });
      setCollectionHero(updated); showNotice(updated.announcementVisible ? 'Announcement updated and visible.' : 'Announcement updated and hidden.');
    } catch (reason) { showError(reason); }
  }
  async function saveCarouselSettings(event) {
    event.preventDefault(); clearToast();
    suppressOwnStoreUpdate();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const autoSlideSeconds = Number(values.autoSlideSeconds);
    if (!Number.isInteger(autoSlideSeconds) || autoSlideSeconds < 1 || autoSlideSeconds > 3600) {
      showError(new Error('Auto-slide time must be a whole number between 1 and 3600 seconds.'));
      return;
    }
    const transitionDurationMs = Number(values.transitionDurationMs);
    if (!Number.isInteger(transitionDurationMs) || transitionDurationMs < 150 || transitionDurationMs > 5000) {
      showError(new Error('Transition speed must be a whole number between 150 and 5000 milliseconds.'));
      return;
    }
    try {
      const updated = await api('/api/carousel/settings', { method: 'PATCH', headers: jsonAuth, body: JSON.stringify({ autoSlideSeconds, fixedSlideId: values.fixedSlideId || null, transitionEffect: values.transitionEffect || 'fade', transitionDurationMs }) });
      setCarouselSettings(updated);
      showNotice(updated.fixedSlideId ? 'Carousel controls saved. The selected image is fixed.' : 'Carousel controls saved. Automatic rotation is active.');
    } catch (reason) { showError(reason); }
  }
  async function changeStatus(order, status) {
    suppressOwnStoreUpdate();
    try { const updated = await api(`/api/orders/${order._id}/status`, { method: 'PATCH', headers: jsonAuth, body: JSON.stringify({ status }) }); setOrders(current => current.map(item => item._id === updated._id ? updated : item)); showNotice('Order status updated.'); }
    catch (reason) { showError(reason); }
  }
  if (!token) return null;
  const startEditProduct = product => { setEditingProduct(product); setProductImage(product.images?.[0] || ''); setRemoveProductImage(false); };
  const startEditSlide = slide => { setEditingSlide(slide); setSlideImage(slide.image); };
  const toastMessage = error || notice, toastIsError = Boolean(error);
  return <main className="admin">{toastMessage && <div className={`admin-toast admin-toast--${toastIsError ? 'error' : 'success'}`} key={toastKey} role={toastIsError ? 'alert' : 'status'} aria-live={toastIsError ? 'assertive' : 'polite'} aria-atomic="true"><span>{toastMessage}</span><button type="button" aria-label="Dismiss notification" onClick={clearToast}>×</button></div>}<div className="admin-top"><Brand /><div className="admin-actions"><Link className="admin-main-page" to="/">Main Page</Link><button onClick={() => { clearAdminSession(); navigate('/admin/login', { replace: true }); }}>Sign out</button></div></div><p className="eyebrow">DASHBOARD</p><h1>Manage collection</h1><AnnouncementForm settings={collectionHero} onSave={saveAnnouncement} /><CollectionHeroForm settings={collectionHero} onSave={saveCollectionHero} /><CarouselSettingsForm settings={carouselSettings} slides={slides} onSave={saveCarouselSettings} /><ProductForm editing={editingProduct} image={productImage} onUpload={file => { setRemoveProductImage(false); upload(file, setProductImage); }} onRemoveImage={() => { setProductImage(''); setRemoveProductImage(true); showNotice('Product image will be removed when you save.'); }} onSave={saveProduct} onCancel={() => { setEditingProduct(null); setProductImage(''); setRemoveProductImage(false); }} /><CarouselForm editing={editingSlide} image={slideImage} onUpload={file => upload(file, setSlideImage)} onRemoveImage={() => editingSlide ? deleteSlide(editingSlide) : (setSlideImage(''), showNotice('Selected carousel image removed.'))} onSave={saveSlide} onCancel={() => { setEditingSlide(null); setSlideImage(''); }} slides={slides} onEdit={startEditSlide} onDelete={deleteSlide} apiImg={apiImg} /><ProductList products={products} onEdit={startEditProduct} onDelete={deleteProduct} /><OrderList orders={orders} onStatusChange={changeStatus} /></main>;
}
