import { useContext } from 'react';
import { money } from '../api';
import { CartContext } from '../context/CartContext';

export default function CartRows() {
  const { cart, increment, decrement, remove } = useContext(CartContext);
  if (!cart.length) return <p>Your bag is empty.</p>;
  return cart.map(item => <div className="bag" key={item._id}><div><b>{item.name}</b><div className="cart-actions"><button onClick={() => decrement(item._id)} aria-label={`Reduce ${item.name}`}>−</button><span>{item.quantity}</span><button onClick={() => increment(item._id)} aria-label={`Add one ${item.name}`}>+</button><button className="remove-link" onClick={() => remove(item._id)}>Remove</button></div></div><b>{money(item.price * item.quantity)}</b></div>);
}
