// server.js
const express = require('express');
const Stripe = require('stripe');
const stripe = Stripe('sk_test_51QbliuP2kqOTkjJTpRyqqpDDSPmEdY6ZIE6XWxXVwZnLAXKpUSMNp7GhNKuVuRJWDr4hFoLwGHIQeKhDZKVzciAl004XiNJL3q'); // replace with your secret key
const app = express();

app.use(express.json());

// Endpoint to create a SetupIntent for saving card details.
app.post('/create-setup-intent', async (req, res) => {
  try {
    // Optionally pass a customerId if you already have one.
    const { customerId } = req.body;
    const setupIntent = await stripe.setupIntents.create({
      payment_method_types: ['card'],
      customer: customerId || undefined,
      usage: 'off_session'
    });
    res.json({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to charge the saved PaymentMethod.
app.post('/charge', async (req, res) => {
  try {
    const { customerId, paymentMethodId, amount, currency } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
      amount, // e.g., 5000 for $50.00
      currency, // e.g., 'usd'
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      setup_future_usage: 'off_session'
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
