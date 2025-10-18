const fs = require('fs')
const path = require('path')
const cloudinary = require('cloudinary').v2
// Load server/.env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

// Configure Cloudinary using env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

async function uploadSeedImages() {
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'seed-images')
    if (!fs.existsSync(uploadsDir)) {
      console.error('Uploads directory not found:', uploadsDir)
      console.error('Please create the folder and place your seed images there.')
      process.exit(1)
    }

    const files = fs.readdirSync(uploadsDir).filter(f => {
      const ext = path.extname(f).toLowerCase()
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)
    })

    if (files.length === 0) {
      console.error('No image files found in', uploadsDir)
      process.exit(1)
    }

    const results = []
    for (const file of files) {
      const filePath = path.join(uploadsDir, file)
      console.log('Uploading', filePath)
      const res = await cloudinary.uploader.upload(filePath, {
        folder: 'algud-seed',
        use_filename: true,
        unique_filename: false,
        overwrite: false
      })
      results.push({
        file,
        secure_url: res.secure_url,
        public_id: res.public_id
      })
      console.log('Uploaded:', res.secure_url)
    }

    // Write results to client public folder so frontend can fetch
    const outDir = path.join(__dirname, '..', '..', 'client', 'public')
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true })
    }
    const outPath = path.join(outDir, 'seedImages.json')
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8')
    console.log('Wrote seedImages.json to', outPath)
    console.log('Done.')
  } catch (err) {
    console.error('Upload failed:', err)
    process.exit(1)
  }
}

uploadSeedImages()
