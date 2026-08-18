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
export const Admin = mongoose.model('Admin', adminSchema);
export const Order = mongoose.model('Order', orderSchema);
export const Carousel = mongoose.model('Carousel', carouselSchema);
export const CollectionHeroSettings = mongoose.model('CollectionHeroSettings', collectionHeroSettingsSchema);
