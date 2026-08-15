import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

export const CartContext = createContext();

function savedCart() {
  try { return JSON.parse(localStorage.getItem('cherie-cart') || '[]'); }
  catch { return []; }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(savedCart);
  useEffect(() => localStorage.setItem('cherie-cart', JSON.stringify(cart)), [cart]);

  const setQuantity = useCallback((id, quantity) => setCart(current => quantity < 1
    ? current.filter(item => item._id !== id)
    : current.map(item => item._id === id ? { ...item, quantity } : item)), []);
  const add = useCallback(product => setCart(current => {
    const found = current.find(item => item._id === product._id);
    return found ? current.map(item => item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { ...product, quantity: 1 }];
  }), []);
  const remove = useCallback(id => setCart(current => current.filter(item => item._id !== id)), []);
  const increment = useCallback(id => setCart(current => current.map(item => item._id === id ? { ...item, quantity: item.quantity + 1 } : item)), []);
  const decrement = useCallback(id => setCart(current => current.reduce((items, item) => {
    if (item._id !== id) return [...items, item];
    return item.quantity > 1 ? [...items, { ...item, quantity: item.quantity - 1 }] : items;
  }, [])), []);
  const value = useMemo(() => ({ cart, setCart, add, remove, increment, decrement, count: cart.reduce((sum, item) => sum + item.quantity, 0) }), [cart, add, remove, increment, decrement]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
