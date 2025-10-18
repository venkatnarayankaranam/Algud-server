const crypto = require('crypto')
const Razorpay = require('razorpay')
const Order = require('../models/Order')

// razorpay config via env
const RZP_KEY_ID = process.env.RZP_KEY_ID
const RZP_KEY_SECRET = process.env.RZP_KEY_SECRET

const razorpayInstance = () => {
  if (!RZP_KEY_ID || !RZP_KEY_SECRET) return null
  return new Razorpay({
    key_id: RZP_KEY_ID,
    key_secret: RZP_KEY_SECRET,
  })
}

// @desc    Create Razorpay order for an existing application Order
// @route   POST /api/payment/create
// @access  Private
const createPayment = async (req, res) => {
  try {
    const { orderId, customerDetails } = req.body
    console.log('createPayment called for orderId=', orderId, 'RZP_KEY_PRESENT=', !!process.env.RZP_KEY_ID)

    const order = await Order.findById(orderId).populate('products.productId', 'name imageURL price')
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })

    if (order.userId.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Access denied' })
    if (order.paymentStatus === 'Paid') return res.status(400).json({ success: false, message: 'Order is already paid' })

    // Use stub mode for local testing if PAYMENT_STUB=true
    if (process.env.PAYMENT_STUB === 'true') {
      const stubTxnId = `${order._id.toString()}_${Date.now()}`
      await Order.findByIdAndUpdate(order._id, { paymentTxnId: stubTxnId })
      const baseUrl = process.env.SERVER_BASE_URL || `http://localhost:${process.env.PORT || 5000}`
      const stubUrl = `${baseUrl}/api/payment/razorpay-stub?txnid=${encodeURIComponent(stubTxnId)}`
      return res.json({ success: true, data: { payment_url: stubUrl, order_id: order._id.toString() } })
    }

    const rzp = razorpayInstance()
    if (!rzp) {
      console.error('Razorpay credentials missing')
      return res.status(500).json({ success: false, message: 'Payment gateway not configured' })
    }

    // Razorpay wants amount in paise (integer)
    const amountInPaise = Math.round(Number(order.totalAmount) * 100)

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `order_rcpt_${order._id}`,
      payment_capture: 1,
    }

    const rzpOrder = await rzp.orders.create(options)

  // Save the razorpay order id as paymentTxnId to verify later
  const updatedOrder = await Order.findByIdAndUpdate(order._id, { paymentTxnId: rzpOrder.id }, { new: true })
  console.log('Updated order paymentTxnId:', updatedOrder?.paymentTxnId)

    // Return order details needed by client to open Razorpay checkout
    const payload = {
      razorpay_order_id: rzpOrder.id,
      razorpay_amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      order_id: order._id.toString(),
      key_id: RZP_KEY_ID,
      customer: {
        name: customerDetails?.name || req.user.name || 'Customer',
        email: customerDetails?.email || req.user.email || '',
        contact: customerDetails?.phone || '',
      }
    }

    return res.json({ success: true, data: payload })
  } catch (error) {
    console.error('Create payment (Razorpay) error:', error)
    res.status(500).json({ success: false, message: 'Server error while creating payment session', details: error.message })
  }
}

// @desc    Verify razorpay payment signature and mark order paid
// @route   POST /api/payment/verify
// @access  Private
const verifyPayment = async (req, res) => {
  try {
    const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body
    console.log('verifyPayment called:', { orderId, has_payment_id: !!razorpay_payment_id, has_order_id: !!razorpay_order_id, has_signature: !!razorpay_signature })

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Missing orderId' })
    }

    // If razorpay-specific fields are not provided, treat this as a status check
    // Return current paymentStatus so the client can poll/verify after redirect
    if (!razorpay_payment_id && !razorpay_order_id && !razorpay_signature) {
      const currentOrder = await Order.findById(orderId)
      if (!currentOrder) return res.status(404).json({ success: false, message: 'Order not found' })
      if (currentOrder.userId.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Access denied' })

      if (currentOrder.paymentStatus === 'Paid') {
        return res.json({ success: true, message: 'Payment already completed', data: { payment_status: 'SUCCESS', payment_id: currentOrder.paymentId } })
      }

      return res.json({ success: false, message: 'Payment not completed', data: { payment_status: 'PENDING' } })
    }

    let order = await Order.findById(orderId)
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })
    if (order.userId.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Access denied' })

    // Verify signature using HMAC SHA256: hmac_sha256(order_id|payment_id, key_secret)
    const generatedSignature = crypto.createHmac('sha256', RZP_KEY_SECRET).update(razorpay_order_id + '|' + razorpay_payment_id).digest('hex')

    if (generatedSignature !== razorpay_signature) {
      console.error('Razorpay signature verification failed', { generatedSignature, razorpay_signature })
      return res.status(400).json({ success: false, message: 'Invalid signature' })
    }

    // At this point signature is valid. If the order does not have paymentTxnId set,
    // set it now to the razorpay_order_id. Also save the paymentId and mark Paid.
    try {
      await Order.findByIdAndUpdate(order._id, { paymentStatus: 'Paid', paymentId: razorpay_payment_id, paymentTxnId: razorpay_order_id })
    } catch (err) {
      console.error('Failed to update order after verification', err)
      // Continue - verification succeeded, but updating DB failed; still return success
      return res.status(500).json({ success: false, message: 'Payment verified but failed to update order' })
    }

    return res.json({ success: true, message: 'Payment verified successfully', data: { payment_status: 'SUCCESS', payment_id: razorpay_payment_id } })
  } catch (error) {
    console.error('Verify payment (Razorpay) error:', error)
    res.status(500).json({ success: false, message: 'Server error while verifying payment', details: error.message })
  }
}

// Backwards-compatible endpoint name used earlier; keep a simple handler for stubs
const payuResponse = async (req, res) => {
  // For compatibility with existing routes, redirect to client with failure
  const clientBase = process.env.CLIENT_URL || 'http://https://algud-iota.vercel.app'
  return res.redirect(`${clientBase}/payment/success?status=failed&verified=false`)
}

// Diagnostic information (safe - does not return secrets)
const diag = async (req, res) => {
  try {
    const info = {
      razorpay_key_present: !!RZP_KEY_ID,
      razorpay_secret_present: !!RZP_KEY_SECRET,
      payment_stub_enabled: process.env.PAYMENT_STUB === 'true',
    }

    res.json({ success: true, data: info })
  } catch (error) {
    console.error('Payment diag error:', error)
    res.status(500).json({ success: false, message: 'Diagnostic failed' })
  }
}

module.exports = {
  createPayment,
  verifyPayment,
  payuResponse,
  // Backwards-compatible webhook endpoint (generic)
  paymentWebhook: async (req, res) => {
    try {
      console.log('Payment webhook received (generic):', req.body)
      res.status(200).json({ success: true })
    } catch (err) {
      console.error('Payment webhook error:', err)
      res.status(500).json({ success: false })
    }
  },
  diag,
}
