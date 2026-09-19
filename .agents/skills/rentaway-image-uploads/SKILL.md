---
name: rentaway-image-uploads
description: >-
  Use this skill when working with product image uploads in RentAway. Covers
  multer configuration, accepted file types, storage path, how images are
  served as static files, and how the frontend sends/displays product images.
---

# RentAway — Image Uploads

## Overview
Product images are uploaded via `multer` (multipart/form-data) and stored on disk in `server/uploads/`.
They are served as static files by Express.

---

## Backend: Multer Configuration

### Storage Setup (in products route)
```js
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowedTypes.includes(file.mimetype));
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});
```

### Route with Upload
```js
router.post('/', authenticate, authorize('supplier'), upload.single('image'), (req, res) => {
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  // store imageUrl in DB...
});
```

---

## Backend: Serving Static Files

In `server/src/index.js`, the uploads folder is served as static:
```js
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
```

Images are accessed at: `http://localhost:5000/uploads/<filename>`

---

## Frontend: Sending Image with Form

```jsx
const formData = new FormData();
formData.append('name', productName);
formData.append('price_per_day', price);
formData.append('image', imageFile); // File object from <input type="file">

await axios.post('/api/products', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

### File Input Handler
```jsx
const [imageFile, setImageFile] = useState(null);

<input
  type="file"
  accept="image/jpeg,image/png,image/webp"
  onChange={(e) => setImageFile(e.target.files[0])}
/>
```

---

## Frontend: Displaying Product Images

```jsx
const BASE_URL = 'http://localhost:5000';

<img
  src={product.image_url ? `${BASE_URL}${product.image_url}` : '/placeholder.jpg'}
  alt={product.name}
/>
```

---

## Uploads Directory
- Path: `server/uploads/`
- Tracked in git: `.gitkeep` file only (actual uploads are `.gitignore`d)
- On fresh clone, the directory exists but is empty

---

## Common Issues
- **Image not showing:** Check that the Express static middleware is registered before routes.
- **413 Payload Too Large:** multer `limits.fileSize` exceeded — default is 5MB.
- **File type rejected:** Only `jpeg`, `png`, `webp` are allowed by the fileFilter.
- **Missing uploads dir:** Create `server/uploads/` if it doesn't exist after a fresh clone.
