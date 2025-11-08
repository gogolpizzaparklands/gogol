const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect } = require('../controllers/authController');
const { authorize } = require('../middleware/role');
const upload = require('../middleware/upload');

router.get('/', productController.list);
router.get('/:id', productController.get);
// seller or admin only for create/update/delete
router.post('/', protect, authorize('seller','admin'), upload.array('images', 5), productController.create);
// support both PUT (with multipart upload) and PATCH (JSON updates) for updating a product
router.put('/:id', protect, authorize('seller','admin'), upload.array('images', 5), productController.update);
router.patch('/:id', protect, authorize('seller','admin'), productController.update);
router.delete('/:id', protect, authorize('seller','admin'), productController.remove);
// remove a single image from a product
router.delete('/:id/images', protect, authorize('seller','admin'), productController.removeImage);
// set cover image for a product (move image to front)
router.patch('/:id/cover', protect, authorize('seller','admin'), productController.setCoverImage);

module.exports = router;
