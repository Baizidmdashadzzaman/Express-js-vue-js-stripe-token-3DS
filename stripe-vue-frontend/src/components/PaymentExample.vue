<template>
    <div>
      <h1>Save Payment Method</h1>
      <form @submit.prevent="savePaymentMethod">
        <div id="card-element"></div>
        <button type="submit" :disabled="loading">
          {{ loading ? "Saving..." : "Save Card" }}
        </button>
        <div v-if="error" class="error">{{ error }}</div>
      </form>
  
      <hr />
  
      <h1>Charge Saved Payment Method</h1>
      <form @submit.prevent="chargePayment">
        <input type="number" v-model="chargeAmount" placeholder="Amount in cents" />
        <input type="text" v-model="currency" placeholder="Currency (e.g., usd)" />
        <button type="submit" :disabled="charging">
          {{ charging ? "Processing..." : "Charge Payment" }}
        </button>
        <div v-if="chargeError" class="error">{{ chargeError }}</div>
        <div v-if="paymentResult" class="success">
          Payment successful: {{ paymentResult.id }}
        </div>
      </form>
    </div>
  </template>
  
  <script>
  import { ref, onMounted } from 'vue';
  import { loadStripe } from '@stripe/stripe-js';
  
  export default {
    name: 'PaymentExample',
    setup() {
      // Replace with your own Stripe publishable key.
      const stripePromise = loadStripe('pk_test_51QbliuP2kqOTkjJT3GygobjbmldAEROcxv6O1bpIll6dyDgNRp9d3YJkv84Rp4VQLgXPIwyoTIRoZTxI6BWXgJzf00buCH8JRw');
      const stripe = ref(null);
      const elements = ref(null);
      const cardElement = ref(null);
      const loading = ref(false);
      const error = ref(null);
      const savedPaymentMethodId = ref(null);
      // Replace with your customer ID (typically created on your backend).
      const customerId = 'cus_YOUR_CUSTOMER_ID';
  
      onMounted(async () => {
        stripe.value = await stripePromise;
        elements.value = stripe.value.elements();
        cardElement.value = elements.value.create('card');
        cardElement.value.mount('#card-element');
      });
  
      // Save card using SetupIntent
      const savePaymentMethod = async () => {
        loading.value = true;
        error.value = null;
  
        try {
          // Request a SetupIntent from your Express backend.
          const response = await fetch('http://localhost:3000/create-setup-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId })
          });
          const data = await response.json();
          if (data.error) {
            throw new Error(data.error);
          }
          const clientSecret = data.clientSecret;
  
          // Confirm the SetupIntent using the card Element.
          const { error: confirmError, setupIntent } = await stripe.value.confirmCardSetup(
            clientSecret,
            { payment_method: { card: cardElement.value } }
          );
  
          if (confirmError) {
            throw new Error(confirmError.message);
          }
          savedPaymentMethodId.value = setupIntent.payment_method;
          console.log('Saved Payment Method ID:', savedPaymentMethodId.value);
        } catch (err) {
          error.value = err.message;
        } finally {
          loading.value = false;
        }
      };
  
      // Variables for charging the saved payment method.
      const chargeAmount = ref('');
      const currency = ref('usd');
      const charging = ref(false);
      const chargeError = ref(null);
      const paymentResult = ref(null);
  
      // Charge the saved payment method using a PaymentIntent.
      const chargePayment = async () => {
        charging.value = true;
        chargeError.value = null;
        paymentResult.value = null;
  
        try {
          if (!savedPaymentMethodId.value) {
            throw new Error('No saved payment method found. Please save a card first.');
          }
          const response = await fetch('http://localhost:3000/charge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerId,
              paymentMethodId: savedPaymentMethodId.value,
              amount: parseInt(chargeAmount.value, 10),
              currency: currency.value
            })
          });
          const result = await response.json();
          if (result.error) {
            throw new Error(result.error);
          }
          paymentResult.value = result;
          console.log('Payment successful:', result);
        } catch (err) {
          chargeError.value = err.message;
        } finally {
          charging.value = false;
        }
      };
  
      return {
        savePaymentMethod,
        loading,
        error,
        chargePayment,
        chargeAmount,
        currency,
        charging,
        chargeError,
        paymentResult
      };
    }
  };
  </script>
  
  <style scoped>
  .error {
    color: red;
  }
  .success {
    color: green;
  }
  </style>
  