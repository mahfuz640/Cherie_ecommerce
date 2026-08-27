import { useContext } from 'react';
import { money } from '../api';
import { CartContext } from '../context/CartContext';

export default function CartRows() {
  const { cart, increment, decrement, remove } = useContext(CartContext);
  if (!cart.length) return <p>Your bag is empty.</p>;
  return cart.map(item => <div className="bag" key={item._id}><div><b>{item.name}</b><small>{money(item.price)} each</small><div className="cart-actions"><button type="button" onClick={() => decrement(item._id)}>−</button><span>{item.quantity}</span><button type="button" onClick={() => increment(item._id)}>+</button><button type="button" className="remove-link" onClick={() => remove(item._id)}>Remove</button></div></div><b>{money(item.price * item.quantity)}</b></div>);
}
