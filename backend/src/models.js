import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  compareAtPrice: { type: Number, min: 0 },
  category: { type: String, default: 'Jewellery', trim: true },
  images: { type: [String], default: [] },
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
  image: { type: String, required: true }, title: { type: String, trim: true }, subtitle: { type: String, trim: true }, link: { type: String, default: '#collection' }
}, { timestamps: true });

export const Product = mongoose.model('Product', productSchema);
export const Admin = mongoose.model('Admin', adminSchema);
export const Order = mongoose.model('Order', orderSchema);
export const Carousel = mongoose.model('Carousel', carouselSchema);
