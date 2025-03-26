<template>
    <div>
      <!-- Create Customer Flow -->
      <h1>Create Customer</h1>
      <form @submit.prevent="createCustomer">
        <input type="email" v-model="email" placeholder="Enter email" required />
        <input type="text" v-model="name" placeholder="Enter name (optional)" />
        <button type="submit" :disabled="creatingCustomer">
          {{ creatingCustomer ? "Creating..." : "Create Customer" }}
        </button>
        <p v-if="customerError" class="error">{{ customerError }}</p>
        <p v-if="customerId">
          Customer created: <strong>{{ customerId }}</strong>
        </p>
      </form>
  
      <hr />
  
      <!-- Save Payment Method Flow -->
      <h1>Save Payment Method</h1>
      <form @submit.prevent="savePaymentMethod">
        <div id="card-element"></div>
        <button type="submit" :disabled="saving">
          {{ saving ? "Saving..." : "Save Card" }}
        </button>
        <p v-if="saveError" class="error">{{ saveError }}</p>
        <p v-if="savedPaymentMethod">
          Payment Method Saved: <strong>{{ savedPaymentMethod }}</strong>
        </p>
      </form>
  
      <hr />
  
      <!-- Charge Payment Flow -->
      <h1>Charge Saved Payment Method</h1>
      <form @submit.prevent="chargePayment">
        <input type="number" v-model="chargeAmount" placeholder="Amount in cents" required />
        <input type="text" v-model="chargeCurrency" placeholder="Currency (e.g., usd)" required />
        <button type="submit" :disabled="charging">
          {{ charging ? "Processing..." : "Charge Payment" }}
        </button>
        <p v-if="chargeError" class="error">{{ chargeError }}</p>
        <p v-if="chargeResult" class="success">
          Payment successful: {{ chargeResult.id }}
        </p>
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
  
      // Customer creation state
      const email = ref('');
      const name = ref('');
      const customerId = ref(null);
      const creatingCustomer = ref(false);
      const customerError = ref(null);
  
      // Payment method saving state
      const saving = ref(false);
      const saveError = ref(null);
      const savedPaymentMethod = ref(null);
  
      // Payment charging state
      const chargeAmount = ref('');
      const chargeCurrency = ref('usd');
      const charging = ref(false);
      const chargeError = ref(null);
      const chargeResult = ref(null);
  
      onMounted(async () => {
        stripe.value = await stripePromise;
        elements.value = stripe.value.elements();
        cardElement.value = elements.value.create('card');
        cardElement.value.mount('#card-element');
      });
  
      // Function: Create a customer on backend
      const createCustomer = async () => {
        creatingCustomer.value = true;
        customerError.value = null;
        try {
          const res = await fetch('http://localhost:3000/create-customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.value, name: name.value })
          });
          const data = await res.json();
          if (data.error) {
            throw new Error(data.error);
          }
          // Save the customer ID returned from Stripe
          customerId.value = data.id;
          console.log('Created customer:', data.id);
        } catch (err) {
          customerError.value = err.message;
        } finally {
          creatingCustomer.value = false;
        }
      };
  
      // Function: Save card using SetupIntent
      const savePaymentMethod = async () => {
        if (!customerId.value) {
          saveError.value = 'Please create a customer first.';
          return;
        }
        saving.value = true;
        saveError.value = null;
        try {
          // Request a SetupIntent from the backend with a valid customer ID.
          const res = await fetch('http://localhost:3000/create-setup-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId: customerId.value })
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          const clientSecret = data.clientSecret;
  
          // Confirm the SetupIntent on-session so that the customer can complete any required authentication.
          const { error, setupIntent } = await stripe.value.confirmCardSetup(
            clientSecret,
            {
              payment_method: { card: cardElement.value }
            }
          );
  
          if (error) throw new Error(error.message);
          savedPaymentMethod.value = setupIntent.payment_method;
          console.log('Saved Payment Method:', setupIntent.payment_method);
        } catch (err) {
          saveError.value = err.message;
        } finally {
          saving.value = false;
        }
      };
  
      // Function: Charge the saved payment method.
      const chargePayment = async () => {
        if (!customerId.value) {
          chargeError.value = 'Customer ID is missing. Please create a customer first.';
          return;
        }
        if (!savedPaymentMethod.value) {
          chargeError.value = 'No saved payment method found. Please save a card first.';
          return;
        }
        charging.value = true;
        chargeError.value = null;
        chargeResult.value = null;
        try {
          const res = await fetch('http://localhost:3000/charge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerId: customerId.value,
              paymentMethodId: savedPaymentMethod.value,
              amount: parseInt(chargeAmount.value, 10),
              currency: chargeCurrency.value,
            })
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          chargeResult.value = data;
          console.log('Charge successful:', data);
        } catch (err) {
          chargeError.value = err.message;
        } finally {
          charging.value = false;
        }
      };
  
      return {
        email,
        name,
        customerId,
        creatingCustomer,
        customerError,
        createCustomer,
        saving,
        saveError,
        savedPaymentMethod,
        savePaymentMethod,
        chargeAmount,
        chargeCurrency,
        charging,
        chargeError,
        chargeResult,
        chargePayment,
      };
    },
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
  