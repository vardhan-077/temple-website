const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { cloudinary, isConfigured } = require('../config/cloudinary');

const UPLOADS_ROOT = path.join(__dirname, '..', 'public', 'uploads');

if (!isConfigured) {
  console.warn(
    '[uploads] Cloudinary is not configured - photos will be saved to disk in public/uploads. ' +
      'That works fine locally or on a VPS, but will NOT persist on hosts with an ephemeral ' +
      'filesystem (e.g. Render free tier wipes disk on every redeploy). See the README for how ' +
      'to add free Cloudinary credentials before you go live.'
  );
}

// Files are held in memory briefly, then handed to either Cloudinary or disk
// below - this way the rest of the app never has to care which one is active.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

function uploadStreamToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `temple-website/${folder}`, resource_type: 'image' },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

async function saveToLocal(file, folder) {
  const dir = path.join(UPLOADS_ROOT, folder);
  fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(file.originalname) || '.jpg';
  const safeName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(dir, safeName), file.buffer);
  return {
    url: `/uploads/${folder}/${safeName}`,
    publicId: `uploads/${folder}/${safeName}`, // marks this as a local file for deleteImage()
  };
}

/**
 * Saves an uploaded file (from multer memoryStorage) to Cloudinary if
 * configured, otherwise to local disk under public/uploads/<folder>/.
 * Returns { url, publicId }.
 */
async function saveImage(file, folder = 'misc') {
  if (!file) return null;
  if (isConfigured) {
    const result = await uploadStreamToCloudinary(file.buffer, folder);
    return { url: result.secure_url, publicId: result.public_id };
  }
  return saveToLocal(file, folder);
}

/**
 * Deletes a previously-saved image, whether it lives on Cloudinary or disk.
 * Safe to call with an empty/placeholder publicId - it just no-ops.
 */
async function deleteImage(publicId) {
  if (!publicId) return;
  try {
    if (publicId.startsWith('uploads/')) {
      const filePath = path.join(__dirname, '..', 'public', publicId);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } else if (isConfigured) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (err) {
    console.warn('[uploads] Could not delete old image:', err.message);
  }
}

module.exports = { upload, saveImage, deleteImage };
