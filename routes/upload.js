const express = require('express')
const { getCloudinarySignature } = require('../controllers/uploadController')

const router = express.Router()

router.get('/cloudinary-sign', getCloudinarySignature)

module.exports = router
