const Product = require('../models/Product');
const cloudinary = require('../config/cloudinary');

// helper to upload buffer to cloudinary (stream)
const streamUpload = (buffer, folder = 'gogol') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (result) resolve(result);
      else reject(error);
    });
    stream.end(buffer);
  });
};

exports.list = async (req, res) => {
  try {
    const { category, minPrice, maxPrice, q } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (q) filter.name = { $regex: q, $options: 'i' };
    if (minPrice || maxPrice) filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.get = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.create = async (req, res) => {
  try {
    const { name, description, price, category } = req.body;
    // basic server-side validation to provide friendly errors and avoid Mongoose throwing
    if (!name || name.toString().trim() === '' || price === undefined || price === null || price === '') {
      return res.status(400).json({ msg: 'name and price are required' })
    }
    const images = [];
    if (req.files && req.files.length) {
      for (const file of req.files) {
        const result = await streamUpload(file.buffer, 'gogol/products');
        images.push({ url: result.secure_url, public_id: result.public_id });
      }
    }
    const productData = { name, description, images, price, category, seller: req.user._id };
    if (images.length) productData.coverImage = images[0];
    const product = new Product(productData);
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.update = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Product not found' });
    // enforce ownership: sellers can only update their own products
    if (req.user.role === 'seller' && String(product.seller) !== String(req.user._id)) {
      return res.status(403).json({ msg: 'Forbidden: not product owner' });
    }
    // merge body fields
    const { name, description, price, category } = req.body;
    if (name) product.name = name;
    if (description) product.description = description;
    if (price) product.price = price;
    if (category) product.category = category;
    // handle new images
    if (req.files && req.files.length) {
      for (const file of req.files) {
        const result = await streamUpload(file.buffer, 'gogol/products');
        product.images.push({ url: result.secure_url, public_id: result.public_id });
      }
      // limit to 5 images
      if (product.images.length > 5) product.images = product.images.slice(0,5);
    }
    // ensure coverImage exists
    if (!product.coverImage && product.images && product.images.length) product.coverImage = product.images[0];
    await product.save();
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.remove = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Product not found' });
    // ownership check: sellers can only delete their own products
    if (req.user.role === 'seller' && String(product.seller) !== String(req.user._id)) {
      return res.status(403).json({ msg: 'Forbidden: not product owner' });
    }
    // remove images from Cloudinary
    if (product.images && product.images.length) {
      for (const img of product.images) {
        try {
          if (img.public_id) await cloudinary.uploader.destroy(img.public_id);
        } catch (e) { console.error('Cloudinary delete failed', e); }
      }
    }
    // Use deleteOne for robustness across mongoose versions
    try {
      await product.deleteOne();
    } catch (e) {
      // fallback to findByIdAndDelete
      await Product.findByIdAndDelete(product._id);
    }
    res.json({ msg: 'Product removed' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.removeImage = async (req, res) => {
  try {
    const { public_id } = req.body;
    if (!public_id) return res.status(400).json({ msg: 'public_id required' });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Product not found' });
    // ownership check
    if (req.user.role === 'seller' && String(product.seller) !== String(req.user._id)) {
      return res.status(403).json({ msg: 'Forbidden: not product owner' });
    }
    // find image entry
    const idx = product.images.findIndex(i => i.public_id === public_id);
    if (idx === -1) return res.status(404).json({ msg: 'Image not found on product' });
    // prevent removing last image
    if (product.images.length <= 1) return res.status(400).json({ msg: 'A product must have at least one image' });
    // destroy on Cloudinary
    try {
      await cloudinary.uploader.destroy(public_id);
    } catch (e) {
      console.error('Cloudinary destroy error', e);
      // continue to remove reference even if destroy fails
    }
    // remove from array
    product.images.splice(idx, 1);
    // if this was the cover image, update coverImage to first image or null
    if (product.coverImage && product.coverImage.public_id === public_id) {
      product.coverImage = product.images && product.images.length ? product.images[0] : undefined;
    }
    await product.save();
    res.json({ msg: 'Image removed', images: product.images, coverImage: product.coverImage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.setCoverImage = async (req, res) => {
  try {
    const { public_id } = req.body;
    if (!public_id) return res.status(400).json({ msg: 'public_id required' });
    // validate product id to avoid CastError when callers pass wrong values
    const mongoose = require('mongoose')
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ msg: 'Invalid product id' })
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Product not found' });
    if (req.user.role === 'seller' && String(product.seller) !== String(req.user._id)) {
      return res.status(403).json({ msg: 'Forbidden: not product owner' });
    }
    const img = product.images.find(i => i.public_id === public_id);
    if (!img) return res.status(404).json({ msg: 'Image not found on product' });
    product.coverImage = img;
    await product.save();
    res.json({ msg: 'Cover set', images: product.images, coverImage: product.coverImage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};
