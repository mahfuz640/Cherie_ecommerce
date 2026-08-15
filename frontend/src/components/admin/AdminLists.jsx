import { money } from '../../api';

export function ProductList({ products, onEdit, onDelete }) {
  return <section><h2>Products</h2><div className="admin-list">{products.length ? products.map(product => <div key={product._id}><span>{product.name} - {money(product.price)}</span><span><button type="button" onClick={() => onEdit(product)}>Edit</button><button type="button" className="danger" onClick={() => onDelete(product)}>Remove</button></span></div>) : <p>No products yet.</p>}</div></section>;
}

export function OrderList({ orders, onStatusChange }) {
  return <section><h2>Orders</h2><div className="admin-list">{orders.length ? orders.map(order => <div key={order._id}><span><b>{order.customer.name}</b> - {money(order.subtotal)} - {order.status}</span><select value={order.status} onChange={event => onStatusChange(order, event.target.value)}>{['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(status => <option key={status}>{status}</option>)}</select></div>) : <p>No orders yet.</p>}</div></section>;
}
