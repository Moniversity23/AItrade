const axios = require('axios');

async function makePayment() {
  try {
    const response = await axios.post('https://paystack.com/pay/charge', {
      reference: crypto.randomBytes(20).toString('hex'),
      amount: 500000,
      callback_url: 'https://aitrade.com/paystack/webhook',
    }, {
      headers: {
        Authorization: 'Bearer YOUR_API_KEY_OR_ACCESS_TOKEN',
      },
    });

    console.log(response.data);
  } catch (error) {
    console.error(error.response.data);
  }
}

makePayment();