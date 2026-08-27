import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import PageLoader from './components/PageLoader';

const Home = lazy(() => import('./pages/Women'));
const Product = lazy(() => import('./pages/Product'));
const Checkout = lazy(() => import('./pages/Checkout'));
const ThankYou = lazy(() => import('./pages/ThankYou'));
const ShippingPolicy = lazy(() => import('./pages/ShippingPolicy'));
const ReturnExchange = lazy(() => import('./pages/ReturnExchange'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const Admin = lazy(() => import('./pages/Admin'));

export default function App() {
  return <Suspense fallback={<PageLoader />}><Routes><Route path="/" element={<Home />} /><Route path="/products/:id" element={<Product />} /><Route path="/checkout" element={<Checkout />} /><Route path="/thank-you" element={<ThankYou />} /><Route path="/shipping-policy" element={<ShippingPolicy />} /><Route path="/return-exchange" element={<ReturnExchange />} /><Route path="/admin/login" element={<AdminLogin />} /><Route path="/admin" element={<Admin />} /></Routes></Suspense>;
}
