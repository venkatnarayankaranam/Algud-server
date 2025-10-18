const crypto = require('crypto')

// GET /api/upload/cloudinary-sign
// Returns signature and timestamp for signed client-side uploads to Cloudinary
const getCloudinarySignature = (req, res) => {
  try {
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME

    if (!apiKey || !apiSecret || !cloudName) {
      return res.status(500).json({ success: false, message: 'Cloudinary not configured on server' })
    }

    const timestamp = Math.floor(Date.now() / 1000)

    // Optionally include folder param in signature
    const folder = req.query.folder ? String(req.query.folder) : null

    // Build string to sign. Include folder if present.
    let toSign = `timestamp=${timestamp}`
    if (folder) toSign += `&folder=${folder}`

    const signature = crypto.createHash('sha1').update(toSign + apiSecret).digest('hex')

    return res.json({
      success: true,
      data: {
        timestamp,
        signature,
        api_key: apiKey,
        cloud_name: cloudName
      }
    })
  } catch (error) {
    console.error('Cloudinary sign error:', error)
    return res.status(500).json({ success: false, message: 'Signing failed' })
  }
}

module.exports = { getCloudinarySignature }
