import { useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, apiImg, money } from '../api';
import Empty from '../components/Empty';
import Layout from '../components/Layout';
import { CartContext } from '../context/CartContext';

export default function Product() {
  const { id } = useParams(), { add } = useContext(CartContext), [product, setProduct] = useState(), [error, setError] = useState(''), [imageFailed, setImageFailed] = useState(false);
  useEffect(() => { setImageFailed(false); api(`/api/products/${id}`).then(setProduct).catch(reason => setError(reason.message)); }, [id]);
  if (error) return <Layout><main><Empty text={error} /></main></Layout>;
  if (!product) return <Layout><main>Loading product...</main></Layout>;
  return <Layout><main className="product"><div className="product-photo">{product.images?.[0] && !imageFailed ? <img src={apiImg(product.images[0])} alt={product.name} onError={() => setImageFailed(true)} /> : <span>&#10022;</span>}</div><article><p className="eyebrow">{product.category}</p><h1>{product.name}</h1><strong className="price">{money(product.price)}</strong>{product.compareAtPrice && <del>{money(product.compareAtPrice)}</del>}<p className="description">{product.description}</p><p className="stock">{product.stock ? `${product.stock} available` : 'Made to order'}</p><button className="button" onClick={() => add(product)}>Add to bag</button><div className="product-promises"><span>&#10022; Gift-ready packaging</span><span>&#10022; Secure local checkout</span><span>&#10022; Personal customer care</span></div></article></main></Layout>;
}
