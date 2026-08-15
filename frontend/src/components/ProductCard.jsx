import { Link } from 'react-router-dom';
import { apiImg, money } from '../api';

export default function ProductCard({ product }) {
  return <Link className="card" to={`/products/${product._id}`}><div className="photo">{product.images?.[0] ? <img src={apiImg(product.images[0])} alt={product.name} loading="lazy" /> : <span>✦</span>}{product.featured && <b>Featured</b>}</div><h3>{product.name}</h3><p>{product.category}</p><strong>{money(product.price)}</strong></Link>;
}
