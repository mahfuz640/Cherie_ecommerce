import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { CartProvider } from './context/CartContext';
import './styles.css';
import './features.css';
import './hero-wide.css';
import './commerce.css';

createRoot(document.getElementById('root')).render(<BrowserRouter><CartProvider><App /></CartProvider></BrowserRouter>);
