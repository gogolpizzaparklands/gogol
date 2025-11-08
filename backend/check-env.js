// Simple environment validator for backend
const required = [
  'MONGO_URI',
  'JWT_SECRET',
  'RESEND_API_KEY',
  'RESEND_FROM',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'MPESA_CONSUMER_KEY',
  'MPESA_CONSUMER_SECRET',
  'MPESA_PASSKEY',
  'MPESA_SHORTCODE',
  'MPESA_CALLBACK_URL'
];

const missing = required.filter(k => !process.env[k]);

if (missing.length) {
  console.error('Missing required environment variables:');
  missing.forEach(m => console.error(' -', m));
  process.exit(1);
}

console.log('All required environment variables are present.');
process.exit(0);
