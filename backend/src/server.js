import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { Product, Admin, Order, Carousel } from './models.js';
import { requireAdmin } from './auth.js';
import { createInvoice } from './invoice.js';

const app = express();
const port = Number(process.env.PORT) || 5000;
const GROQ_MODELS = (process.env.GROQ_MODELS || 'not-configured')
  .split(',')
  .map(model => model.trim())
  .filter(Boolean);

const localOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const configuredOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...configuredOrigins, ...localOrigins]);
const renderOrigin = /^https:\/\/[a-z0-9-]+\.onrender\.com$/i;
const allowRenderOrigins = process.env.ALLOW_RENDER_ORIGINS !== 'false';

app.use(cors({
  origin(origin, callback) {
    const isAllowed = !origin
      || allowedOrigins.has(origin)
      || (allowRenderOrigins && renderOrigin.test(origin));
    callback(isAllowed ? null : new Error('Origin is not allowed by CORS.'), isAllowed);
  }
}));
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (_, file, callback) => callback(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
});
const upload = multer({
  storage,
  fileFilter: (_, file, callback) => callback(null, file.mimetype.startsWith('image/'))
});

const databaseState = () => ({
  0: 'offline',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting'
}[mongoose.connection.readyState] || 'offline');

const requireDatabase = (_, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'Database is temporarily unavailable. Please try again shortly.' });
  }
  next();
};

const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

app.get('/api/health', (_, res) => res.status(200).json({
  status: 'online',
  provider: 'Groq',
  models: GROQ_MODELS,
  database: databaseState()
}));

app.get('/api/carousel', requireDatabase, asyncRoute(async (_, res) => {
  res.json(await Carousel.find().sort({ createdAt: -1 }));
}));

app.post('/api/carousel', requireAdmin, requireDatabase, asyncRoute(async (req, res) => {
  if (!req.body.image) return res.status(400).json({ message: 'A carousel image is required.' });
  res.status(201).json(await Carousel.create(req.body));
}));

app.patch('/api/carousel/:id', requireAdmin, requireDatabase, asyncRoute(async (req, res) => {
  const slide = await Carousel.findByIdAndUpdate(req.params.id, req.body, { new: true });
  slide ? res.json(slide) : res.status(404).json({ message: 'Slide not found.' });
}));

app.delete('/api/carousel/:id', requireAdmin, requireDatabase, asyncRoute(async (req, res) => {
  const slide = await Carousel.findById(req.params.id);
  if (!slide) return res.status(404).json({ message: 'Slide not found.' });
  await Carousel.findByIdAndDelete(req.params.id);
  res.status(204).end();
}));

app.post('/api/auth/login', requireDatabase, asyncRoute(async (req, res) => {
  const password = req.body?.password || '';
  if (!password) return res.status(400).json({ message: 'Password is required.' });

  const email = (process.env.ADMIN_EMAIL || 'admin@cherie.com').toLowerCase();
  const admin = await Admin.findOne({ email });
  if (!admin || !await bcrypt.compare(password, admin.passwordHash)) {
    return res.status(401).json({ message: 'Invalid password.' });
  }

  res.json({
    token: jwt.sign({ id: admin._id, email: admin.email }, process.env.JWT_SECRET, { expiresIn: '12h' }),
    email: admin.email
  });
}));

app.get('/api/products', requireDatabase, asyncRoute(async (req, res) => {
  const query = req.query.category ? { category: req.query.category } : {};
  res.json(await Product.find(query).sort({ featured: -1, createdAt: -1 }));
}));

app.get('/api/products/:id', requireDatabase, asyncRoute(async (req, res) => {
  const item = await Product.findById(req.params.id);
  item ? res.json(item) : res.status(404).json({ message: 'Product not found.' });
}));

app.post('/api/products', requireAdmin, requireDatabase, asyncRoute(async (req, res) => {
  res.status(201).json(await Product.create(req.body));
}));

app.patch('/api/products/:id', requireAdmin, requireDatabase, asyncRoute(async (req, res) => {
  const item = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  item ? res.json(item) : res.status(404).json({ message: 'Product not found.' });
}));

app.delete('/api/products/:id', requireAdmin, requireDatabase, asyncRoute(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found.' });
  await Product.findByIdAndDelete(req.params.id);
  res.status(204).end();
}));

app.post('/api/upload', requireAdmin, upload.single('image'), (req, res) => {
  req.file
    ? res.status(201).json({ url: `/uploads/${req.file.filename}` })
    : res.status(400).json({ message: 'Choose an image.' });
});

app.post('/api/orders', requireDatabase, asyncRoute(async (req, res) => {
  const { customer, items } = req.body;
  if (!customer?.name || !customer?.phone || !customer?.address || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ message: 'Customer and order items are required.' });
  }

  const ids = items.map(item => item.productId);
  const products = await Product.find({ _id: { $in: ids } });
  if (products.length !== ids.length) return res.status(400).json({ message: 'A product is unavailable.' });

  const lines = items.map(item => {
    const product = products.find(value => String(value._id) === item.productId);
    return {
      product: product._id,
      name: product.name,
      price: product.price,
      quantity: Math.max(1, Number(item.quantity) || 1)
    };
  });
  const subtotal = lines.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const order = await Order.create({ customer, items: lines, subtotal });
  res.status(201).json({ orderId: order._id, invoiceUrl: `/api/orders/${order._id}/invoice` });
}));

app.get('/api/orders/:id/invoice', requireDatabase, asyncRoute(async (req, res) => {
  const order = await Order.findById(req.params.id);
  order ? createInvoice(res, order) : res.status(404).json({ message: 'Order not found.' });
}));

app.get('/api/orders', requireAdmin, requireDatabase, asyncRoute(async (_, res) => {
  res.json(await Order.find().sort({ createdAt: -1 }));
}));

app.patch('/api/orders/:id/status', requireAdmin, requireDatabase, asyncRoute(async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  order ? res.json(order) : res.status(404).json({ message: 'Order not found.' });
}));

app.use((error, _, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  const status = error.name === 'CastError' ? 400 : error.status || 500;
  const message = status >= 500 ? 'Server is temporarily unavailable. Please try again shortly.' : error.message;
  res.status(status).json({ message });
});

let reconnectTimer;
async function connectMongo() {
  try {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    });

    const email = (process.env.ADMIN_EMAIL || 'admin@cherie.com').toLowerCase();
    if (!await Admin.findOne({ email })) {
      await Admin.create({
        email,
        passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'ChangeMe123!', 12)
      });
    }
    console.log('MongoDB connected.');
  } catch (error) {
    console.error(`MongoDB unavailable: ${error.message}`);
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined;
        connectMongo();
      }, 30000);
    }
  }
}

function start() {
  const server = app.listen(port, () => console.log(`Cherie API online on :${port}`));
  server.on('error', error => {
    console.error(`Server failed to start: ${error.message}`);
    process.exitCode = 1;
  });
  connectMongo();
}

start();
