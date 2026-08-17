import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiImg, money } from '../api';

export default function ProductCard({ product }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = product.images?.[0];
  return <Link className="card" to={`/products/${product._id}`}><div className="photo">{image && !imageFailed ? <img src={apiImg(image)} alt={product.name} loading="lazy" onError={() => setImageFailed(true)} /> : <span>&#10022;</span>}{product.featured && <b>Featured</b>}</div><h3>{product.name}</h3><p>{product.category}</p><strong>{money(product.price)}</strong></Link>;
}
