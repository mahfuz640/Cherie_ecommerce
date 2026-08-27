import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server as SocketIOServer } from 'socket.io';
import {
  Product,
  Admin,
  Order,
  Carousel,
  CarouselSettings,
  CAROUSEL_SETTINGS_DEFAULTS,
  CAROUSEL_ALLOWED_TRANSITION_EFFECTS,
  CAROUSEL_TRANSITION_DURATION_MIN_MS,
  CAROUSEL_TRANSITION_DURATION_MAX_MS,
  CAROUSEL_SETTINGS_KEY,
  CollectionHeroSettings,
  COLLECTION_HERO_DEFAULTS,
  COLLECTION_HERO_SETTINGS_KEY,
  gridFsImageIdFromUrl,
  isPersistentImageDataUrl,
  isPersistentImageReference
} from './models.js';
import { requireAdmin } from './auth.js';
import { createInvoice } from './invoice.js';

const app = express();
const httpServer = createServer(app);
const port = Number(process.env.PORT) || 5000;
const uploadsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads');
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

const corsOrigin = (origin, callback) => {
  const isAllowed = !origin
    || allowedOrigins.has(origin)
    || (allowRenderOrigins && renderOrigin.test(origin));
  callback(isAllowed ? null : new Error('Origin is not allowed by CORS.'), isAllowed);
};
const corsOptions = { origin: corsOrigin };
const io = new SocketIOServer(httpServer, {
  cors: { ...corsOptions, methods: ['GET', 'POST'] }
});

// This is a lightweight client heartbeat for an already-open storefront tab.
// It does not carry credentials or store data, and it is not relied on as a
// hosting uptime guarantee.
io.on('connection', socket => {
  socket.on('store:keepalive', () => {
    socket.emit('store:alive', { timestamp: new Date().toISOString() });
  });
});

app.use(cors(corsOptions));
// New image uploads use multipart streams directly into GridFS, rather than a
// JSON data URL. This compatibility parser is only for existing data:image
// records and normal API payloads; file uploads do not pass through this limit.
app.use(express.json({ limit: '20mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(uploadsDirectory));

const upload = multer({
  // The storage engine pipes the incoming file straight into GridFS. There is
  // intentionally no Multer file-size limit or in-memory image buffer.
  storage: {
    _handleFile(_, file, callback) {
      let settled = false;
      const finish = (error, info) => {
        if (settled) return;
        settled = true;
        callback(error, info);
      };

      try {
        const stream = imageBucket().openUploadStream(`image-${Date.now()}`, {
          contentType: file.mimetype,
          metadata: { originalName: file.originalname || 'image' }
        });
        stream.once('error', error => finish(error));
        stream.once('finish', () => finish(null, {
          id: stream.id,
          filename: stream.filename,
          contentType: file.mimetype,
          length: stream.length
        }));
        file.stream.once('error', error => finish(error));
        file.stream.pipe(stream);
      } catch (error) {
        finish(error);
      }
    },
    _removeFile(_, file, callback) {
      const id = file?.id && mongoose.isObjectIdOrHexString(file.id)
        ? new mongoose.Types.ObjectId(file.id)
        : null;
      if (!id) return callback(null);
      imageBucket().delete(id).then(() => callback(null), callback);
    }
  },
  fileFilter: (_, file, callback) => callback(null, typeof file.mimetype === 'string' && file.mimetype.startsWith('image/'))
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

// Storefront and admin clients use this signal to refetch only the resources
// that changed. Keep it deliberately payload-free: order/customer data and
// authentication details must never travel in a broadcast event.
function emitStoreUpdate(resources) {
  const changedResources = [...new Set(resources)].filter(Boolean);
  if (!changedResources.length) return;
  io.emit('store:update', {
    resources: changedResources,
    timestamp: new Date().toISOString()
  });
}

function imageBucket() {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    const error = new Error('Database is temporarily unavailable. Please try again shortly.');
    error.status = 503;
    throw error;
  }
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'images' });
}

function imageObjectIdFromUrl(value) {
  const id = gridFsImageIdFromUrl(value);
  return id ? new mongoose.Types.ObjectId(id) : null;
}

async function imageReferenceError(value, label) {
  if (isPersistentImageDataUrl(value)) return null;
  const id = imageObjectIdFromUrl(value);
  if (!id || !isPersistentImageReference(value)) {
    return `${label} must be an uploaded /api/images/:id URL or an existing data:image value.`;
  }
  const file = await mongoose.connection.db.collection('images.files').findOne(
    { _id: id },
    { projection: { _id: 1 } }
  );
  return file ? null : `${label} upload was not found. Upload the image again.`;
}

async function carouselImageError(body, { required = false } = {}) {
  if (!body || Array.isArray(body) || typeof body !== 'object') {
    return 'Request body must be a JSON object.';
  }
  if (!Object.hasOwn(body, 'image')) {
    return required ? 'A carousel image is required.' : null;
  }
  return imageReferenceError(body.image, 'Carousel image');
}

async function productImagesError(body) {
  if (!body || Array.isArray(body) || typeof body !== 'object') {
    return 'Request body must be a JSON object.';
  }
  if (!Object.hasOwn(body, 'images')) return null;
  if (!Array.isArray(body.images)) return 'Product images must be a list. Use an empty image list to remove all images.';
  const errors = await Promise.all(body.images.map(image => imageReferenceError(image, 'Product image')));
  const error = errors.find(Boolean);
  if (error) return error;
  return null;
}

async function cleanupGridFsImageIfUnreferenced(imageUrl) {
  const id = imageObjectIdFromUrl(imageUrl);
  if (!id) return false;

  const [productReference, carouselReference] = await Promise.all([
    Product.exists({ images: imageUrl }),
    Carousel.exists({ image: imageUrl })
  ]);
  if (productReference || carouselReference) return false;

  try {
    await imageBucket().delete(id);
    return true;
  } catch (error) {
    // The database record has already changed. Do not turn a successful admin
    // action into an error or remove another file; an orphan can be retried later.
    console.warn(`GridFS image cleanup skipped for ${id}: ${error.message}`);
    return false;
  }
}

async function cleanupRemovedGridFsImages(previousImages, currentImages = []) {
  const current = new Set(currentImages);
  const removed = [...new Set(previousImages)].filter(image => !current.has(image));
  await Promise.all(removed.map(cleanupGridFsImageIfUnreferenced));
}

const carouselSettingsPayload = settings => ({
  autoSlideSeconds: settings?.autoSlideSeconds ?? CAROUSEL_SETTINGS_DEFAULTS.autoSlideSeconds,
  fixedSlideId: settings?.fixedSlideId ? String(settings.fixedSlideId) : null,
  transitionEffect: settings?.transitionEffect ?? CAROUSEL_SETTINGS_DEFAULTS.transitionEffect,
  transitionDurationMs: settings?.transitionDurationMs ?? CAROUSEL_SETTINGS_DEFAULTS.transitionDurationMs
});

async function carouselSettingsChanges(body) {
  if (!body || Array.isArray(body) || typeof body !== 'object') {
    return { error: 'Carousel settings must be a JSON object.' };
  }

  const allowedFields = ['autoSlideSeconds', 'fixedSlideId', 'transitionEffect', 'transitionDurationMs'];
  const fields = Object.keys(body);
  const unknownField = fields.find(field => !allowedFields.includes(field));
  if (unknownField) return { error: `Unsupported carousel setting: ${unknownField}.` };
  if (!fields.length) return { error: 'Provide at least one carousel setting to update.' };

  const changes = {};
  if (Object.hasOwn(body, 'autoSlideSeconds')) {
    const seconds = body.autoSlideSeconds;
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > 3600) {
      return { error: 'Auto-slide time must be a whole number from 1 to 3600 seconds.' };
    }
    changes.autoSlideSeconds = seconds;
  }

  if (Object.hasOwn(body, 'fixedSlideId')) {
    const fixedSlideId = body.fixedSlideId;
    if (fixedSlideId === null || fixedSlideId === '') {
      changes.fixedSlideId = null;
    } else if (typeof fixedSlideId !== 'string' || !mongoose.isObjectIdOrHexString(fixedSlideId)) {
      return { error: 'Fixed slide must be a valid carousel slide or be cleared.' };
    } else {
      const slide = await Carousel.exists({ _id: fixedSlideId });
      if (!slide) return { error: 'The selected fixed slide no longer exists.' };
      changes.fixedSlideId = slide._id;
    }
  }

  if (Object.hasOwn(body, 'transitionEffect')) {
    const transitionEffect = body.transitionEffect;
    if (typeof transitionEffect !== 'string' || !CAROUSEL_ALLOWED_TRANSITION_EFFECTS.includes(transitionEffect)) {
      return { error: 'Transition effect is not supported.' };
    }
    changes.transitionEffect = transitionEffect;
  }

  if (Object.hasOwn(body, 'transitionDurationMs')) {
    const duration = body.transitionDurationMs;
    if (!Number.isInteger(duration)
      || duration < CAROUSEL_TRANSITION_DURATION_MIN_MS
      || duration > CAROUSEL_TRANSITION_DURATION_MAX_MS) {
      return {
        error: `Transition duration must be a whole number from ${CAROUSEL_TRANSITION_DURATION_MIN_MS} to ${CAROUSEL_TRANSITION_DURATION_MAX_MS} milliseconds.`
      };
    }
    changes.transitionDurationMs = duration;
  }

  return { changes };
}

const collectionHeroPayload = settings => ({
  eyebrow: settings?.eyebrow ?? COLLECTION_HERO_DEFAULTS.eyebrow,
  heading: settings?.heading ?? COLLECTION_HERO_DEFAULTS.heading,
  description: settings?.description ?? COLLECTION_HERO_DEFAULTS.description,
  visible: settings?.visible ?? COLLECTION_HERO_DEFAULTS.visible,
  announcementText: settings?.announcementText ?? COLLECTION_HERO_DEFAULTS.announcementText,
  announcementVisible: settings?.announcementVisible ?? COLLECTION_HERO_DEFAULTS.announcementVisible
});

function collectionHeroChanges(body) {
  if (!body || Array.isArray(body) || typeof body !== 'object') {
    return { error: 'Settings must be a JSON object.' };
  }

  const allowedFields = ['eyebrow', 'heading', 'description', 'visible', 'announcementText', 'announcementVisible'];
  const fields = Object.keys(body);
  const unknownField = fields.find(field => !allowedFields.includes(field));
  if (unknownField) return { error: `Unsupported setting: ${unknownField}.` };
  if (!fields.length) return { error: 'Provide at least one setting to update.' };

  const changes = {};
  if (Object.hasOwn(body, 'eyebrow')) {
    if (typeof body.eyebrow !== 'string' || !body.eyebrow.trim()) return { error: 'Collection label is required.' };
    if (body.eyebrow.trim().length > 80) return { error: 'Collection label must be 80 characters or fewer.' };
    changes.eyebrow = body.eyebrow.trim();
  }
  if (Object.hasOwn(body, 'heading')) {
    if (typeof body.heading !== 'string' || !body.heading.trim()) return { error: 'Collection heading is required.' };
    if (body.heading.trim().length > 160) return { error: 'Collection heading must be 160 characters or fewer.' };
    changes.heading = body.heading.trim();
  }
  if (Object.hasOwn(body, 'description')) {
    if (typeof body.description !== 'string' || !body.description.trim()) return { error: 'Collection description is required.' };
    if (body.description.trim().length > 360) return { error: 'Collection description must be 360 characters or fewer.' };
    changes.description = body.description.trim();
  }
  if (Object.hasOwn(body, 'visible')) {
    if (typeof body.visible !== 'boolean') return { error: 'Visible must be true or false.' };
    changes.visible = body.visible;
  }
  if (Object.hasOwn(body, 'announcementText')) {
    if (typeof body.announcementText !== 'string' || !body.announcementText.trim()) {
      return { error: 'Announcement text is required.' };
    }
    if (body.announcementText.trim().length > 180) {
      return { error: 'Announcement text must be 180 characters or fewer.' };
    }
    changes.announcementText = body.announcementText.trim();
  }
  if (Object.hasOwn(body, 'announcementVisible')) {
    if (typeof body.announcementVisible !== 'boolean') {
      return { error: 'Announcement visibility must be true or false.' };
    }
    changes.announcementVisible = body.announcementVisible;
  }
  return { changes };
}

app.get('/api/health', (_, res) => res.status(200).json({
  status: 'online',
  provider: 'Groq',
  models: GROQ_MODELS,
  database: databaseState(),
  databaseConfigured: Boolean(normalizedMongoUri()),
  databaseConfigSource: mongoConfig().key,
  authenticationConfigured: Boolean(jwtSecret()),
  databaseIssue: databaseState() === 'connected' ? null : lastMongoIssue
}));

app.get('/api/collection-hero', requireDatabase, asyncRoute(async (_, res) => {
  const settings = await CollectionHeroSettings.findOne({ key: COLLECTION_HERO_SETTINGS_KEY }).lean();
  res.json(collectionHeroPayload(settings));
}));

app.patch('/api/collection-hero', requireAdmin, requireDatabase, asyncRoute(async (req, res) => {
  const { changes, error } = collectionHeroChanges(req.body);
  if (error) return res.status(400).json({ message: error });
  const defaultsForInsert = Object.fromEntries(
    Object.entries(COLLECTION_HERO_DEFAULTS).filter(([field]) => !Object.hasOwn(changes, field))
  );

  const settings = await CollectionHeroSettings.findOneAndUpdate(
    { key: COLLECTION_HERO_SETTINGS_KEY },
    { $set: changes, $setOnInsert: { key: COLLECTION_HERO_SETTINGS_KEY, ...defaultsForInsert } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: false }
  ).lean();
  emitStoreUpdate(['collectionHero']);
  res.json(collectionHeroPayload(settings));
}));

app.get('/api/images/:id', requireDatabase, asyncRoute(async (req, res, next) => {
  const id = imageObjectIdFromUrl(`/api/images/${req.params.id}`);
  if (!id) return res.status(404).json({ message: 'Image not found.' });

  const file = await mongoose.connection.db.collection('images.files').findOne(
    { _id: id },
    { projection: { contentType: 1, length: 1 } }
  );
  if (!file) return res.status(404).json({ message: 'Image not found.' });

  res.set({
    'Content-Type': file.contentType || 'application/octet-stream',
    'Content-Length': String(file.length),
    'Cache-Control': 'public, max-age=31536000, immutable'
  });
  const stream = imageBucket().openDownloadStream(id);
  stream.once('error', error => {
    if (res.headersSent) return res.destroy(error);
    next(error);
  });
  stream.pipe(res);
}));

app.get('/api/carousel', requireDatabase, asyncRoute(async (_, res) => {
  res.json(await Carousel.find().sort({ createdAt: -1 }));
}));

// Keep these static settings routes above /api/carousel/:id so "settings" is
// never treated as a carousel document id.
app.get('/api/carousel/settings', requireDatabase, asyncRoute(async (_, res) => {
  const settings = await CarouselSettings.findOne({ key: CAROUSEL_SETTINGS_KEY }).lean();
  res.json(carouselSettingsPayload(settings));
}));

app.patch('/api/carousel/settings', requireAdmin, requireDatabase, asyncRoute(async (req, res) => {
  const { changes, error } = await carouselSettingsChanges(req.body);
  if (error) return res.status(400).json({ message: error });

  const defaultsForInsert = Object.fromEntries(
    Object.entries(CAROUSEL_SETTINGS_DEFAULTS).filter(([field]) => !Object.hasOwn(changes, field))
  );
  const settings = await CarouselSettings.findOneAndUpdate(
    { key: CAROUSEL_SETTINGS_KEY },
    { $set: changes, $setOnInsert: { key: CAROUSEL_SETTINGS_KEY, ...defaultsForInsert } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: false }
  ).lean();
  emitStoreUpdate(['carouselSettings']);
  res.json(carouselSettingsPayload(settings));
}));

app.post('/api/carousel', requireAdmin, requireDatabase, asyncRoute(async (req, res) => {
  const error = await carouselImageError(req.body, { required: true });
  if (error) return res.status(400).json({ message: error });
  const slide = await Carousel.create(req.body);
  emitStoreUpdate(['carousel']);
  res.status(201).json(slide);
}));

app.patch('/api/carousel/:id', requireAdmin, requireDatabase, asyncRoute(async (req, res) => {
  const error = await carouselImageError(req.body);
  if (error) return res.status(400).json({ message: error });
  const previous = await Carousel.findById(req.params.id);
  if (!previous) return res.status(404).json({ message: 'Slide not found.' });
  const slide = await Carousel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (previous.image !== slide.image) await cleanupGridFsImageIfUnreferenced(previous.image);
  emitStoreUpdate(['carousel']);
  res.json(slide);
}));

app.delete('/api/carousel/:id', requireAdmin, requireDatabase, asyncRoute(async (req, res) => {
  const slide = await Carousel.findById(req.params.id);
  if (!slide) return res.status(404).json({ message: 'Slide not found.' });
  await Carousel.findByIdAndDelete(req.params.id);
  const settingsResult = await CarouselSettings.updateOne(
    { key: CAROUSEL_SETTINGS_KEY, fixedSlideId: slide._id },
    { $set: { fixedSlideId: null } }
  );
  await cleanupGridFsImageIfUnreferenced(slide.image);
  emitStoreUpdate(settingsResult.modifiedCount ? ['carousel', 'carouselSettings'] : ['carousel']);
  res.status(204).end();
}));

app.post('/api/auth/login', requireDatabase, asyncRoute(async (req, res) => {
  const password = req.body?.password || '';
  if (!password) return res.status(400).json({ message: 'Password is required.' });

  const secret = jwtSecret();
  if (!secret) {
    console.error('Admin sign-in blocked: JWT_SECRET is not configured.');
    return res.status(503).json({ message: 'Admin sign-in is not configured yet. Please contact the store owner.' });
  }

  const email = (process.env.ADMIN_EMAIL || 'admin@cherie.com').toLowerCase();
  const admin = await Admin.findOne({ email });
  if (!admin || !await bcrypt.compare(password, admin.passwordHash)) {
    return res.status(401).json({ message: 'Invalid password.' });
  }

  res.json({
    token: jwt.sign({ id: admin._id, email: admin.email }, secret, { expiresIn: '12h' }),
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
  const error = await productImagesError(req.body);
  if (error) return res.status(400).json({ message: error });
  const product = await Product.create(req.body);
  emitStoreUpdate(['products']);
  res.status(201).json(product);
}));

app.patch('/api/products/:id', requireAdmin, requireDatabase, asyncRoute(async (req, res) => {
  const error = await productImagesError(req.body);
  if (error) return res.status(400).json({ message: error });
  const previous = await Product.findById(req.params.id);
  if (!previous) return res.status(404).json({ message: 'Product not found.' });
  const item = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (Object.hasOwn(req.body, 'images')) {
    await cleanupRemovedGridFsImages(previous.images || [], item.images || []);
  }
  emitStoreUpdate(['products']);
  res.json(item);
}));

app.delete('/api/products/:id', requireAdmin, requireDatabase, asyncRoute(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found.' });
  await Product.findByIdAndDelete(req.params.id);
  await cleanupRemovedGridFsImages(product.images || []);
  emitStoreUpdate(['products']);
  res.status(204).end();
}));

app.post('/api/upload', requireAdmin, requireDatabase, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Choose an image.' });
  res.status(201).json({ url: `/api/images/${req.file.id}` });
});

app.post('/api/orders', requireDatabase, asyncRoute(async (req, res) => {
  const { customer, items, deliveryArea = 'inside-dhaka', paymentMethod = 'cod' } = req.body;
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
  const safeDeliveryArea = deliveryArea === 'outside-dhaka' ? 'outside-dhaka' : 'inside-dhaka';
  const deliveryCharge = safeDeliveryArea === 'outside-dhaka' ? 130 : 70;
  const safePaymentMethod = ['cod', 'bkash', 'nagad'].includes(paymentMethod) ? paymentMethod : 'cod';
  const order = await Order.create({ customer, items: lines, subtotal, deliveryArea: safeDeliveryArea, deliveryCharge, total: subtotal + deliveryCharge, paymentMethod: safePaymentMethod });
  emitStoreUpdate(['orders']);
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
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  emitStoreUpdate(['orders']);
  res.json(order);
}));

app.use((error, _, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  const isUploadError = error instanceof multer.MulterError;
  const isValidationError = error.name === 'ValidationError';
  const isJsonTooLarge = error.type === 'entity.too.large' || error.status === 413;
  const status = isUploadError || isValidationError || error.name === 'CastError'
    ? 400
    : isJsonTooLarge ? 413 : error.status || 500;
  const message = isUploadError
    ? 'Image upload failed.'
    : isJsonTooLarge
      ? 'This JSON request is too large. Upload image files through /api/upload instead.'
    : (status >= 500 ? 'Server is temporarily unavailable. Please try again shortly.' : error.message);
  res.status(status).json({ message });
});

let reconnectTimer;
let lastMongoIssue = null;
const mongoEnvironmentKeys = ['MONGODB_URI', 'MONGO_URI', 'MONGO_URL', 'MONGODB_URL', 'MONGODB_CONNECTION_STRING'];

function cleanMongoUri(value) {
  return String(value || '')
    .trim()
    .replace(/^[A-Z_]+=(?=mongodb(?:\+srv)?:\/\/)/i, '')
    .replace(/^['"]|['"]$/g, '');
}

function mongoConfig() {
  let invalidKey = null;
  for (const key of mongoEnvironmentKeys) {
    const uri = cleanMongoUri(process.env[key]);
    if (!uri) continue;
    if (/^mongodb(?:\+srv)?:\/\//i.test(uri)) return { key, uri, invalid: false };
    invalidKey ||= key;
  }
  return { key: invalidKey, uri: '', invalid: Boolean(invalidKey) };
}

function normalizedMongoUri() {
  return mongoConfig().uri;
}

function jwtSecret() {
  return String(process.env.JWT_SECRET || '').trim();
}

function mongoIssueCode(error) {
  const message = String(error?.message || '').toLowerCase();
  const config = mongoConfig();
  if (config.invalid) return 'invalid_mongodb_uri';
  if (!config.uri) return 'missing_mongodb_uri';
  if (message.includes('authentication failed') || message.includes('bad auth')) return 'authentication_failed';
  if (message.includes('querysrv') || message.includes('getaddrinfo') || message.includes('dns')) return 'dns_failure';
  if (message.includes('could not connect to any servers') || message.includes('server selection') || message.includes('timed out')) {
    return 'network_or_atlas_access';
  }
  if (message.includes('invalid') || message.includes('connection string')) return 'invalid_mongodb_uri';
  return 'connection_failed';
}

async function connectMongo() {
  try {
    const uri = normalizedMongoUri();
    if (!uri) throw new Error('MONGODB_URI is required.');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      autoSelectFamily: true,
      autoSelectFamilyAttemptTimeout: 1000
    });

    const email = (process.env.ADMIN_EMAIL || 'admin@cherie.com').toLowerCase();
    if (!await Admin.findOne({ email })) {
      await Admin.create({
        email,
        passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'ChangeMe123!', 12)
      });
    }
    await CollectionHeroSettings.updateOne(
      { key: COLLECTION_HERO_SETTINGS_KEY },
      { $setOnInsert: { ...COLLECTION_HERO_DEFAULTS } },
      { upsert: true, setDefaultsOnInsert: true }
    );
    // Older collection-settings documents predate the announcement fields. Add
    // only fields that are absent, leaving every existing admin setting intact.
    await CollectionHeroSettings.updateOne(
      { key: COLLECTION_HERO_SETTINGS_KEY, announcementText: { $exists: false } },
      { $set: { announcementText: COLLECTION_HERO_DEFAULTS.announcementText } },
      { runValidators: true }
    );
    await CollectionHeroSettings.updateOne(
      { key: COLLECTION_HERO_SETTINGS_KEY, announcementVisible: { $exists: false } },
      { $set: { announcementVisible: COLLECTION_HERO_DEFAULTS.announcementVisible } },
      { runValidators: true }
    );
    await CarouselSettings.updateOne(
      { key: CAROUSEL_SETTINGS_KEY },
      { $setOnInsert: { key: CAROUSEL_SETTINGS_KEY, ...CAROUSEL_SETTINGS_DEFAULTS } },
      { upsert: true, setDefaultsOnInsert: true }
    );
    // Existing settings documents may predate one of these controls. Fill only
    // missing values so an administrator's saved preference is never replaced.
    await CarouselSettings.updateOne(
      { key: CAROUSEL_SETTINGS_KEY, autoSlideSeconds: { $exists: false } },
      { $set: { autoSlideSeconds: CAROUSEL_SETTINGS_DEFAULTS.autoSlideSeconds } },
      { runValidators: true }
    );
    await CarouselSettings.updateOne(
      { key: CAROUSEL_SETTINGS_KEY, fixedSlideId: { $exists: false } },
      { $set: { fixedSlideId: CAROUSEL_SETTINGS_DEFAULTS.fixedSlideId } },
      { runValidators: true }
    );
    await CarouselSettings.updateOne(
      { key: CAROUSEL_SETTINGS_KEY, transitionEffect: { $exists: false } },
      { $set: { transitionEffect: CAROUSEL_SETTINGS_DEFAULTS.transitionEffect } },
      { runValidators: true }
    );
    await CarouselSettings.updateOne(
      { key: CAROUSEL_SETTINGS_KEY, transitionDurationMs: { $exists: false } },
      { $set: { transitionDurationMs: CAROUSEL_SETTINGS_DEFAULTS.transitionDurationMs } },
      { runValidators: true }
    );
    lastMongoIssue = null;
    console.log('MongoDB connected.');
  } catch (error) {
    lastMongoIssue = mongoIssueCode(error);
    console.error(`MongoDB unavailable [${lastMongoIssue}]: ${error.message}`);
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined;
        connectMongo();
      }, 30000);
    }
  }
}

function start() {
  httpServer.listen(port, () => console.log(`Cherie API online on :${port}`));
  httpServer.on('error', error => {
    console.error(`Server failed to start: ${error.message}`);
    process.exitCode = 1;
  });
  connectMongo();
}

start();
