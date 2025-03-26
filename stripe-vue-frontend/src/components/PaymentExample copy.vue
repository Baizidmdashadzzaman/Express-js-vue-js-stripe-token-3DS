  <template>
    <div>
      <h1>Create Customer (if needed)</h1>
      <form @submit.prevent="createCustomer">
        <input type="email" v-model="email" placeholder="Enter your email" required />
        <input type="text" v-model="name" placeholder="Enter your name (optional)" />
        <button type="submit" :disabled="creatingCustomer">
          {{ creatingCustomer ? "Creating..." : "Create Customer" }}
        </button>
        <div v-if="customerError" class="error">{{ customerError }}</div>
        <div v-if="customerId" class="success">Customer created: {{ customerId }}</div>
      </form>
  
      <hr />
  
      <h1>Save Payment Method</h1>
      <form @submit.prevent="savePaymentMethod">
        <div id="card-element"></div>
        <button type="submit" :disabled="savingPayment">
          {{ savingPayment ? "Saving Card..." : "Save Card" }}
        </button>
        <div v-if="setupError" class="error">{{ setupError }}</div>
        <div v-if="savedPaymentMethodId" class="success">
          Payment method saved: {{ savedPaymentMethodId }}
        </div>
      </form>
  
      <hr />
  
      <h1>Charge Saved Payment Method</h1>
      <form @submit.prevent="chargePayment">
        <input type="number" v-model="chargeAmount" placeholder="Amount in cents" required />
        <input type="text" v-model="currency" placeholder="Currency (e.g. usd)" required />
        <button type="submit" :disabled="charging">
          {{ charging ? "Processing Charge..." : "Charge Payment" }}
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
  
      // States for creating customer.
      const email = ref('');
      const name = ref('');
      const customerId = ref('');
      const creatingCustomer = ref(false);
      const customerError = ref(null);
  
      // States for saving card.
      const savingPayment = ref(false);
      const setupError = ref(null);
      const savedPaymentMethodId = ref('');
  
      // States for charging.
      const chargeAmount = ref('');
      const currency = ref('usd');
      const charging = ref(false);
      const chargeError = ref(null);
      const paymentResult = ref(null);
  
      // On mount, initialize Stripe and mount the card Element.
      onMounted(async () => {
        stripe.value = await stripePromise;
        elements.value = stripe.value.elements();
        cardElement.value = elements.value.create('card');
        cardElement.value.mount('#card-element');
      });
  
      // Function to create a customer via your backend.
      const createCustomer = async () => {
        creatingCustomer.value = true;
        customerError.value = null;
        try {
          const response = await fetch('http://localhost:3000/create-customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.value, name: name.value })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error);
          customerId.value = data.id;
        } catch (err) {
          customerError.value = err.message;
        } finally {
          creatingCustomer.value = false;
        }
      };
  
      // Function to save a payment method using SetupIntent.
      const savePaymentMethod = async () => {
        savingPayment.value = true;
        setupError.value = null;
        try {
          if (!customerId.value) {
            throw new Error('Please create a customer first.');
          }
          // Request a SetupIntent from your backend.
          const response = await fetch('http://localhost:3000/create-setup-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId: customerId.value })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error);
          const clientSecret = data.clientSecret;
  
          // Confirm the SetupIntent with the card details.
          const { error: confirmError, setupIntent } = await stripe.value.confirmCardSetup(
            clientSecret,
            {
              payment_method: { card: cardElement.value }
            }
          );
          if (confirmError) throw new Error(confirmError.message);
          savedPaymentMethodId.value = setupIntent.payment_method;
        } catch (err) {
          setupError.value = err.message;
        } finally {
          savingPayment.value = false;
        }
      };
  
      // Function to charge the saved payment method.
      const chargePayment = async () => {
        charging.value = true;
        chargeError.value = null;
        paymentResult.value = null;
        try {
          if (!customerId.value || !savedPaymentMethodId.value) {
            throw new Error('Customer and saved payment method are required.');
          }
          const response = await fetch('http://localhost:3000/charge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerId: customerId.value,
              paymentMethodId: savedPaymentMethodId.value,
              amount: parseInt(chargeAmount.value, 10),
              currency: currency.value
            })
          });
          const result = await response.json();
          if (result.error) throw new Error(result.error);
          paymentResult.value = result;
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
        createCustomer,
        creatingCustomer,
        customerError,
        savePaymentMethod,
        savingPayment,
        setupError,
        savedPaymentMethodId,
        chargeAmount,
        currency,
        charging,
        chargeError,
        paymentResult,
        chargePayment
      };
    }
  };
  </script>
  
  <style scoped>
  .error {
    color: red;
    margin-top: 10px;
  }
  .success {
    color: green;
    margin-top: 10px;
  }
  form {
    margin-bottom: 20px;
  }
  input {
    margin: 5px;
    padding: 8px;
    border: 1px solid #ccc;
  }
  button {
    padding: 8px 16px;
  }
  </style>
  