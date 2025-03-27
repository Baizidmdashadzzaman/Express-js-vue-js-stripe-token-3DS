// server.js
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');

const app = express();
const stripe = Stripe(''); // replace with your secret key

// Enable CORS for all routes (or restrict to your frontend's origin)
app.use(cors({
  origin: 'http://localhost:5173'
}));

// Middleware to parse JSON bodies
app.use(express.json());

// Endpoint: Create a new customer
app.post('/create-customer', async (req, res) => {
  try {
    const { email, name } = req.body;
    const customer = await stripe.customers.create({ email, name });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Create a SetupIntent with automatic_payment_methods and disable redirects
app.post('/create-setup-intent', async (req, res) => {
  try {
    const { customerId } = req.body;
    if (!customerId) {
      return res.status(400).json({ error: 'customerId is required' });
    }
    const setupIntent = await stripe.setupIntents.create({
      // Enable automatic payment methods and disable redirect-based methods
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // This ensures that redirect-based payment methods are not accepted.
      },
      customer: customerId,
      usage: 'off_session',
    });
    res.json({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Charge a saved PaymentMethod without enabling redirects
app.post('/charge', async (req, res) => {
  try {
    const { customerId, paymentMethodId, amount, currency } = req.body;
    if (!customerId || !paymentMethodId || !amount || !currency) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      payment_method: paymentMethodId,
      // Confirm on-session so the customer can authenticate if needed.
      confirm: true,
      setup_future_usage: 'off_session',
      // Disable redirect-based payment methods for this PaymentIntent as well:
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    });
    res.json(paymentIntent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});
