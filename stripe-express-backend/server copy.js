// server.js
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');

const app = express();
const stripe = Stripe('sk_test_51QbliuP2kqOTkjJTpRyqqpDDSPmEdY6ZIE6XWxXVwZnLAXKpUSMNp7GhNKuVuRJWDr4hFoLwGHIQeKhDZKVzciAl004XiNJL3q'); // replace with your secret key
 // Replace with your Stripe secret key

// Enable CORS for all routes. Optionally, restrict to your frontend's origin.
app.use(cors({
  origin: 'http://localhost:5173' // adjust if your frontend runs on a different port
}));

// Middleware to parse JSON bodies
app.use(express.json());

// ---------------------------
// Endpoint: Create a new customer
// ---------------------------
app.post('/create-customer', async (req, res) => {
  try {
    // Expect an email (and optionally a name) from the client
    const { email, name } = req.body;
    const customer = await stripe.customers.create({
      email,
      name,
    });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------
// Endpoint: Create a SetupIntent for saving card details
// ---------------------------
app.post('/create-setup-intent', async (req, res) => {
  try {
    // The client should send a valid customer ID that exists in Stripe.
    const { customerId } = req.body;
    if (!customerId) {
      return res.status(400).json({ error: 'customerId is required' });
    }
    const setupIntent = await stripe.setupIntents.create({
      payment_method_types: ['card'],
      customer: customerId,
      usage: 'off_session',
    });
    res.json({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------
// Endpoint: Charge a saved PaymentMethod
// ---------------------------
app.post('/charge', async (req, res) => {
  try {
    // Expect the client to send:
    // - customerId: a valid Stripe customer ID
    // - paymentMethodId: the saved PaymentMethod ID (from SetupIntent)
    // - amount: charge amount in smallest currency unit (e.g., cents)
    // - currency: three-letter ISO currency code (e.g., 'usd')
    const { customerId, paymentMethodId, amount, currency } = req.body;
    
    // Basic validation
    if (!customerId || !paymentMethodId || !amount || !currency) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount, // e.g., 5000 for $50.00
      currency, // e.g., 'usd'
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      // This parameter attaches the payment method for future off-session payments.
      setup_future_usage: 'off_session'
    });
    res.json(paymentIntent);
  } catch (error) {
    // Stripe may return an error if additional authentication is required
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});
