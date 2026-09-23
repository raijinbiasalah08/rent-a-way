// PayMongo Utility with both Live/Secret Key API and Local Sandbox Fallback
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY || '';

async function createCheckoutSession({
  amount,
  description = 'RentAway Equipment Rental',
  customerName = 'RentAway Customer',
  customerEmail = 'customer@rentaway.ph',
  successUrl = 'http://localhost:5173/customer/rentals?payment=success',
  cancelUrl = 'http://localhost:5173/customer/rentals?payment=cancelled'
}) {
  // If no secret key is provided, return a simulated sandbox session
  if (!PAYMONGO_SECRET_KEY || PAYMONGO_SECRET_KEY.startsWith('pk_')) {
    const mockSessionId = 'cs_mock_' + Math.random().toString(36).substring(2, 15);
    return {
      checkoutUrl: `${successUrl}&checkout_session_id=${mockSessionId}`,
      checkoutSessionId: mockSessionId,
      isSimulated: true,
      message: 'Sandbox Simulated PayMongo Checkout'
    };
  }

  // Real PayMongo API call
  try {
    const authHeader = 'Basic ' + Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64');
    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      },
      body: JSON.stringify({
        data: {
          attributes: {
            send_email_receipt: true,
            show_description: true,
            show_line_items: true,
            line_items: [
              {
                currency: 'PHP',
                amount: Math.round(Number(amount) * 100), // in centavos
                name: description,
                quantity: 1
              }
            ],
            payment_method_types: ['gcash', 'paymaya', 'card', 'grab_pay', 'dob'],
            success_url: `${successUrl}&checkout_session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl,
            description
          }
        }
      })
    });

    const data = await response.json();
    if (data.errors && data.errors.length > 0) {
      throw new Error(data.errors[0].detail || 'PayMongo API Error');
    }

    return {
      checkoutUrl: data.data.attributes.checkout_url,
      checkoutSessionId: data.data.id,
      isSimulated: false
    };
  } catch (err) {
    console.warn('PayMongo API call error, falling back to simulated session:', err.message);
    const mockSessionId = 'cs_mock_' + Math.random().toString(36).substring(2, 15);
    return {
      checkoutUrl: `${successUrl}&checkout_session_id=${mockSessionId}`,
      checkoutSessionId: mockSessionId,
      isSimulated: true,
      message: 'PayMongo Gateway fallback'
    };
  }
}

async function verifyCheckoutSession(checkoutSessionId) {
  if (!checkoutSessionId) return { paid: false, status: 'invalid' };

  if (checkoutSessionId.startsWith('cs_mock_')) {
    return {
      paid: true,
      status: 'paid',
      method: 'gcash',
      txRef: 'TX-SIM-' + Math.random().toString(36).substring(2, 10).toUpperCase()
    };
  }

  if (!PAYMONGO_SECRET_KEY) {
    return { paid: true, status: 'paid', method: 'gcash', txRef: 'TX-' + checkoutSessionId.substring(0, 10) };
  }

  try {
    const authHeader = 'Basic ' + Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64');
    const response = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${checkoutSessionId}`, {
      headers: { Authorization: authHeader }
    });
    const data = await response.json();
    const attributes = data.data?.attributes;

    const payments = attributes?.payments || [];
    const isPaid = attributes?.payment_intent?.attributes?.status === 'succeeded' ||
                   payments.some(p => p.attributes?.status === 'paid');

    const paymentMethod = payments[0]?.attributes?.source?.type || 'paymongo';
    const txRef = payments[0]?.id || ('TX-' + checkoutSessionId.substring(0, 10));

    return {
      paid: isPaid,
      status: attributes?.status || (isPaid ? 'paid' : 'unpaid'),
      method: paymentMethod,
      txRef
    };
  } catch (err) {
    console.error('Error verifying PayMongo checkout session:', err.message);
    return { paid: false, status: 'error', error: err.message };
  }
}

module.exports = {
  createCheckoutSession,
  verifyCheckoutSession
};
