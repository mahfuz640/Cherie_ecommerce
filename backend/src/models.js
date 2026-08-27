import mongoose from 'mongoose';

export const COLLECTION_HERO_SETTINGS_KEY = 'collection-hero';
export const COLLECTION_HERO_DEFAULTS = Object.freeze({
  eyebrow: 'CHERIE COLLECTION',
  heading: 'Made to be beloved always.',
  description: 'Discover a piece made for your story.',
  visible: true,
  announcementText: 'Complimentary gift wrapping on every Cherie order',
  announcementVisible: true
});
export const CAROUSEL_SETTINGS_KEY = 'carousel';
// These are the current effects offered in the admin UI. The short legacy
// names are accepted separately below so saved settings from older versions
// remain readable and editable without a destructive migration.
export const CAROUSEL_TRANSITION_EFFECTS = Object.freeze([
  'slide-left', 'slide-right', 'slide-up', 'slide-down',
  'push-left', 'push-right', 'push-up', 'push-down',
  'fade', 'cross-fade',
  'zoom-in', 'zoom-out', 'zoom-blur',
  'pan-left', 'pan-right', 'pan-up', 'pan-down',
  'swipe-left', 'swipe-right',
  'wipe-left', 'wipe-right', 'wipe-up', 'wipe-down',
  'rotate', 'flip-horizontal', 'flip-vertical',
  'cube-left', 'cube-right', 'page-turn', 'roll', 'stretch', 'shrink',
  'blur-transition', 'flash', 'glitch', 'light-leak',
  'radial-wipe', 'circle-open', 'circle-close',
  'split-horizontal', 'split-vertical',
  'curtain', 'shutter', 'ripple', 'wave', 'morph'
]);
export const CAROUSEL_LEGACY_TRANSITION_EFFECTS = Object.freeze(['slide', 'zoom', 'reveal']);
export const CAROUSEL_ALLOWED_TRANSITION_EFFECTS = Object.freeze([
  ...CAROUSEL_TRANSITION_EFFECTS,
  ...CAROUSEL_LEGACY_TRANSITION_EFFECTS
]);
export const CAROUSEL_TRANSITION_DURATION_MIN_MS = 150;
export const CAROUSEL_TRANSITION_DURATION_MAX_MS = 5000;
export const CAROUSEL_SETTINGS_DEFAULTS = Object.freeze({
  autoSlideSeconds: 5,
  fixedSlideId: null,
  transitionEffect: 'fade',
  transitionDurationMs: 800
});

const persistentImageDataUrl = /^data:image\/[a-z0-9][a-z0-9.+-]*;base64,([A-Za-z0-9+/]+={0,2})$/i;
const gridFsImageUrl = /^\/api\/images\/([a-f\d]{24})$/i;

// Legacy images carry their bytes with the document. Keep accepting those values
// while new uploads use the GridFS references below.
export function isPersistentImageDataUrl(value) {
  if (typeof value !== 'string') return false;
  const match = value.match(persistentImageDataUrl);
  return Boolean(match && match[1].length % 4 === 0);
}

// New uploads live in GridFS and are referenced by this stable, public API URL.
// Keep accepting the older in-document data URLs so existing product and carousel
// records remain usable without a destructive data migration.
export function gridFsImageIdFromUrl(value) {
  if (typeof value !== 'string') return null;
  return value.match(gridFsImageUrl)?.[1] || null;
}

export function isPersistentImageReference(value) {
  return isPersistentImageDataUrl(value) || Boolean(gridFsImageIdFromUrl(value));
}

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  compareAtPrice: { type: Number, min: 0 },
  category: { type: String, default: 'Jewellery', trim: true },
  images: {
    type: [{
      type: String,
      validate: {
        validator: isPersistentImageReference,
        message: 'Each product image must be an uploaded /api/images/:id URL or an existing data:image value.'
      }
    }],
    default: []
  },
  stock: { type: Number, default: 0, min: 0 },
  featured: { type: Boolean, default: false }
}, { timestamps: true });

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, minlength: 1, maxlength: 80 },
  image: {
    type: String,
    required: [true, 'A category image is required.'],
    validate: {
      validator: isPersistentImageReference,
      message: 'Category image must be an uploaded /api/images/:id URL or an existing data:image value.'
    }
  }
}, { timestamps: true });

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true }
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  customer: {
    name: { type: String, required: true }, email: String, phone: { type: String, required: true }, address: { type: String, required: true }
  },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String, price: Number, quantity: Number
  }],
  subtotal: { type: Number, required: true },
  deliveryArea: { type: String, enum: ['inside-dhaka', 'outside-dhaka'], default: 'inside-dhaka' },
  deliveryCharge: { type: Number, min: 0, default: 0 },
  total: { type: Number, min: 0 },
  paymentMethod: { type: String, enum: ['cod', 'bkash', 'nagad'], default: 'cod' },
  status: { type: String, enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'], default: 'pending' }
}, { timestamps: true });

const carouselSchema = new mongoose.Schema({
  image: {
    type: String,
    required: [true, 'A carousel image is required.'],
    validate: {
      validator: isPersistentImageReference,
      message: 'Carousel image must be an uploaded /api/images/:id URL or an existing data:image value.'
    }
  },
  title: { type: String, trim: true }, subtitle: { type: String, trim: true }, link: { type: String, default: '#collection' }
}, { timestamps: true });

const carouselSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, immutable: true, default: CAROUSEL_SETTINGS_KEY },
  autoSlideSeconds: { type: Number, required: true, min: 1, max: 3600, default: CAROUSEL_SETTINGS_DEFAULTS.autoSlideSeconds },
  fixedSlideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Carousel', default: CAROUSEL_SETTINGS_DEFAULTS.fixedSlideId },
  transitionEffect: {
    type: String,
    required: true,
    enum: CAROUSEL_ALLOWED_TRANSITION_EFFECTS,
    default: CAROUSEL_SETTINGS_DEFAULTS.transitionEffect
  },
  transitionDurationMs: {
    type: Number,
    required: true,
    min: CAROUSEL_TRANSITION_DURATION_MIN_MS,
    max: CAROUSEL_TRANSITION_DURATION_MAX_MS,
    default: CAROUSEL_SETTINGS_DEFAULTS.transitionDurationMs
  }
}, { timestamps: true });

const collectionHeroSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, immutable: true, default: COLLECTION_HERO_SETTINGS_KEY },
  eyebrow: { type: String, required: true, trim: true, minlength: 1, maxlength: 80, default: COLLECTION_HERO_DEFAULTS.eyebrow },
  heading: { type: String, required: true, trim: true, minlength: 1, maxlength: 160, default: COLLECTION_HERO_DEFAULTS.heading },
  description: { type: String, required: true, trim: true, minlength: 1, maxlength: 360, default: COLLECTION_HERO_DEFAULTS.description },
  visible: { type: Boolean, default: COLLECTION_HERO_DEFAULTS.visible },
  announcementText: { type: String, required: true, trim: true, minlength: 1, maxlength: 180, default: COLLECTION_HERO_DEFAULTS.announcementText },
  announcementVisible: { type: Boolean, default: COLLECTION_HERO_DEFAULTS.announcementVisible }
}, { timestamps: true });

export const Product = mongoose.model('Product', productSchema);
export const Category = mongoose.model('Category', categorySchema);
export const Admin = mongoose.model('Admin', adminSchema);
export const Order = mongoose.model('Order', orderSchema);
export const Carousel = mongoose.model('Carousel', carouselSchema);
export const CarouselSettings = mongoose.model('CarouselSettings', carouselSettingsSchema);
export const CollectionHeroSettings = mongoose.model('CollectionHeroSettings', collectionHeroSettingsSchema);
