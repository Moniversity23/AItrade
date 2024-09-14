require('dotenv').config();
const express = require('express');
const Paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY);
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const ejs = require('ejs');
const OneSignal = require('onesignal-node');
const crypto = require('crypto');
const axios = require('axios');
const dotenv = require('dotenv');
const ngrok = require('ngrok');
const cron = require('node-cron');// Load environment variables from.env file
const { updateProfileValidation, handleValidationErrors } = require('./validation');
dotenv.config();


const router = express.Router();



const app = express();
const port = process.env.PORT || 4000;

// Replace with your actual connection string (avoid storing directly in code)
const connectionString = process.env.MONGO_URI;

mongoose.connect(connectionString)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));
 
    
  const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    yourName: { type: String, required: true },
    email: { type: String, required: true, unique: true }, // Add email field
    password: { type: String, required: true },
    capital: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    lastDeposit: { type: Date }, // Field to track the last deposit time
    role: { type: String, default: 'user' },
  });

const User = mongoose.model('User', userSchema);


const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  bankName: {type: String},
  accountNumber: {type: String},
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reference: { type: String },
});


const Transaction = mongoose.model('Transaction', transactionSchema);
// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from public folder
app.set('view engine', 'ejs'); // Set EJS as the templating engine
app.set('views', path.join(__dirname, 'views'));// Set the directory for views
app.use(express.static(path.join(__dirname, 'script.js')));
// Session configuration
app.use(
  session({
    secret: 'promise081', // Replace with a strong secret key
    resave: false,
    saveUninitialized: true,
  })
);

// Initialize OneSignal Client
const oneSignalClient = new OneSignal.Client({
  userAuthKey: 'MmU2ODIzOTMtYTEyNy00NmZhLTllYmItYTlmYzc4NDAwNjhj',  // Replace with your actual User Auth Key
  app: { 
    appAuthKey: 'MDhkZjIyNGMtMDNiZC00NjQxLTk5YzgtZmY4ZTI4ZWYyZDUy',  // Replace with your actual REST API Key
    appId: '2582f0bd-cb10-4413-9887-48d3eb5f3d98'  // Your shared App ID
  }
});

// Function to send a notification when a withdrawal is made
const sendWithdrawalNotification = async (user, amount) => {
  try {
    const notification = {
      contents: { 
        en: `Withdrawal request of ${amount} by ${user.username}.` 
      },
      included_segments: ["All"],  // You can specify more refined segments if needed
    };

    const response = await oneSignalClient.createNotification(notification);
    console.log("Notification sent:", response);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

app.use(flash());




// Routes


// flash route

app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.errorMessage = req.flash('errorMessage'); // Use consistent keys
  next();
});




app.post('/submit-form', (req, res) => { // ... process form data
  req.flash('success', 'Form submitted successfully!');
  res.redirect('/home');
});

app.get('/signup', (req, res) => {
  res.render('signup.ejs', { title: 'Signup'});
});
app.post('/signup', async (req, res) => {
  const username = req.body.username;
  const yourName = req.body.yourName;
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;

  // Validation
  if (!yourName ||!username||!password ||!confirmPassword || password!== confirmPassword ||!email) {
    return res.render('signup', { errorMessage: 'Please fill all fields and ensure passwords match.' });
  }

  // Email validation (using a simple regex for demonstration purposes)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.render('signup', { errorMessage: 'Invalid email address.' });
  }

  // Hash the password before storing
  const hashedPassword = await bcrypt.hash(password, 10); // Adjust salt rounds as needed

  // Create a new user object
  const newUser = new User({ username:username, yourName:yourName, password: hashedPassword, email });

  try {
    // Save the user to the database
    await newUser.save();
    res.redirect('/login'); // Redirect to login page after successful signup
  } catch (err) {
    console.error(err);
    res.redirect('/signup'); // Handle potential errors
  }
});

//login route

app.get('/login', (req, res) => {
  res.render('login.ejs', { title: 'Login'});
});

app.post('/login', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const user = await User.findOne({ username }); // Use Mongoose for user lookup

  if (user) {
    const passwordMatch = await bcrypt.compare(password, user.password); // Compare hashed password
    if (passwordMatch) {
      req.session.userId = user._id;  // Store user ID in session (use Mongoose object ID)
      req.session.userEmail = user.email; req.flash('success', 'You have successfully logged in!'); // Store user email in session
      res.redirect('/');
    } else {
      req.flash('errorMessage', 'Invalid username or password.');
      res.render('login.ejs', { title: 'Login'});
    }
}
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});
app.get('/signup.ejs', (req, res) => {
  res.render('signup');
  
});


// Home route (with authentication check)
app.get('/', (req, res) => {
  const userId = req.session.userId;

  if (userId) {
    User.findById(userId) // Use Mongoose to find user by ID
      .then(user => {
        if (user) {
          // Pass the entire user object to the EJS template
          res.render('aitrade.ejs', { title: 'AItrade', user: user.yourName, data: user });
        } else {
          res.redirect('/login'); // Handle case where user not found in DB
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect('/login'); // Handle potential errors
      });
  } else {
    res.redirect('/login');
  }
});
// Route to render support page
app.get('/support', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  // Render the support.ejs template
  res.render('support.ejs', {
    title: 'Support', // You can pass a title or other data if needed
    user: req.session.username // Optionally, pass user data to the template
  });
});
// Render profile page
app.get('/profile', (req, res) => {
  res.render('profile', { user: req.user }); // Assuming user data is stored in req.user
});
// Update user profile
app.post('/profile', async (req, res) => {
  try {
      const { username, email, password } = req.body;
      const userId = req.user._id; // Assuming user ID is stored in req.user

      // Update logic here (validate input, hash password if changed, etc.)
      const updatedUser = {};
      if (username) updatedUser.username = username;
      if (email) updatedUser.email = email;
      if (password) updatedUser.password = await bcrypt.hash(password, 10);

      await User.findByIdAndUpdate(userId, updatedUser);

      req.flash('success', 'Profile updated successfully.');
      res.redirect('/profile');
  } catch (error) {
      req.flash('error', 'An error occurred while updating your profile.');
      res.redirect('/profile');
  }
});

router.post('/profile', updateProfileValidation, handleValidationErrors, async (req, res) => {
  const { username, email, password } = req.body;
  try {
      // Process the valid data
      const userId = req.user._id; // Assuming user ID is stored in req.user

      const updatedUser = {};
      if (username) updatedUser.username = username;
      if (email) updatedUser.email = email;
      if (password) updatedUser.password = await bcrypt.hash(password, 10);

      await User.findByIdAndUpdate(userId, updatedUser);

      req.flash('success', 'Profile updated successfully.');
      res.redirect('/profile');
  } catch (error) {
      req.flash('error', 'An error occurred while updating your profile.');
      res.redirect('/profile');
  }
});

module.exports = router;
app.get('/Transactions', (req, res) => {
  const userId = req.session.userId;

  if (userId) {
    Transaction.find({ userId })
    .then(transactions => {
        User.findById(userId) // Fetch user details for rendering
          .then(user => {
            if (user) {
              res.render('transactions.ejs', {
                title: 'Transactions', 
                user: user.yourName,
                data:user.username, 
                transactions: transactions,
              });
            } else {
              res.redirect('/login'); // Handle case where user not found in DB
            }
          })
          .catch(err => {
            console.error(err);
            res.redirect('/transactions'); // Handle potential errors on user retrieval
          });
      })
      .catch(err => {
        console.error(err);
        res.redirect('/transactions'); // Handle potential errors on transaction retrieval
      });
  } else {
    res.redirect('/login');
  }
});

// Route to render the withdrawal page
// GET route to render the withdrawal page
// Route to render the withdrawal page
app.get('/withdraw', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  try {
    const user = await User.findById(req.session.userId);
    res.render('withdrawal.ejs', {
      user: user.username,
      data: {
        capital: user.capital,
        profit: user.profit
      },
      title: 'Withdraw Funds'
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Route to handle withdrawal form submission
app.post('/withdraw', async (req, res) => {
  const { amount, bankName, accountNumber, bankCode } = req.body;
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const user = await User.findById(userId);

    // Check if the user has enough capital or profit to withdraw
    if ((user.capital + user.profit) < amount) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Deduct the amount from the user's capital or profit
    if (user.capital >= amount) {
      user.capital -= amount;
    } else {
      const remainder = amount - user.capital;
      user.capital = 0;
      user.profit -= remainder;
    }

    await user.save();
    
    // Create a new transaction for the withdrawal
    const newTransaction = new Transaction({
      userId,
      type: 'Withdrawal',
      amount,
      bankName,
      accountNumber,
      status: 'pending'
    });
    await newTransaction.save();

     // Trigger OneSignal Notification for Withdrawal
     sendWithdrawalNotification(user, amount);

    // Return success response
    res.render('withdrawal-success.ejs', {
      user: user.username,
      amount: amount,
      capital: user.capital,
      profit: user.profit
    });
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Deposit handling (bank transfer)
app.get('/deposit', (req, res) => {
  const userId = req.session.userId;

  if (userId) {
    User.findById(userId) // Use Mongoose to find user
      .then(user => {
        if (user) {
          res.render('deposit.ejs', { 
            title: 'Deposit Funds', 
            user: user.username, 
            userEmail: req.session.userEmail,
            data: user, 
            errorMessage: req.flash('errorMessage')[0],
            paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY // Pass the public key
          });
        } else {
          res.redirect('/login'); // Handle case where user not found in DB
        }
      })
      .catch(err => {
        console.error("Error fetching user:", err);
        res.redirect('/transaction'); // Handle potential errors
      });
  } else {
    res.redirect('/login'); // Redirect to login if not authenticated
  }
});


app.post('/deposit', async (req, res) => {
  const userId = req.session.userId;
  const depositAmount = parseFloat(req.body.depositAmount);

  if (!userId) {
    return res.redirect('/login'); // Redirect to login if no user ID
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.redirect('/login');
    }

    // Generate a unique reference for the transaction
    const reference = crypto.randomBytes(20).toString('hex'); 
    const newTransaction = new Transaction({
      userId,
      type: 'Deposit (Paystack)',
      amount: depositAmount,
      reference,
    });
    await newTransaction.save();
    
    // Update the user's capital and lastDeposit fields
    user.capital += depositAmount;
    user.lastDeposit = new Date(); // Update the lastDeposit field to the current date and time
    await user.save();
    
    // Setup for Paystack
    const paystackData = {
      reference,
      amount: depositAmount * 100,
      email: user.email, // Use the email from user model
      callback_url: `${process.env.BASE_URL}/paystack/webhook`,
    };

    const response = await axios.post('https://api.paystack.co/transaction/initialize', paystackData, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
    });

    if (response.status === 200 && response.data.status === 'success') {
      res.redirect(response.data.data.authorization_url);
    } else {
      throw new Error('Failed to initiate Paystack payment.');
    }
  } catch (err) {
    console.error('Error during deposit:', err);
    res.render('deposit.ejs', {
      title: 'Deposit Funds',
      user: req.session.username,
      data: user,
      errorMessage: 'Deposit failed. Please try again.',
    });
  }
});
// Example in your route handler after receiving Paystack callback
// Paystack callback route
app.post('/paystack-callback', async (req, res) => {
  const { user, reference, amount } = req.body; // Adjust according to how you receive data
  console.log(`User before deposit: ${JSON.stringify(user)}`);

  try {
      // Find the user by ID
      const userRecord = await User.findById(user.id);
      if (!userRecord) {
          return res.status(404).json({ message: 'User not found' });
      }

      // Check if the transaction already exists
      const existingTransaction = await Transaction.findOne({ reference });
      if (existingTransaction) {
          return res.status(400).json({ message: 'Transaction already processed' });
      }

      // Log the transaction
      const newTransaction = new Transaction({
          reference: reference,
          amount: amount,
          userId: user.id,
          type: 'deposit',
          date: new Date(),
          status: 'approved'
      });
      await newTransaction.save();

      // Update user's capital
      const depositAmount = parseFloat(amount);
      userRecord.capital += depositAmount; // Add the deposited amount to the user's capital

      // Save the updated user record
      await userRecord.save();
      console.log('User capital after deposit:', userRecord.capital);

      // Respond with success
      res.status(200).json({ message: 'Transaction successful', transaction: newTransaction });

  } catch (error) {
      console.error('Error processing Paystack callback:', error);
      res.status(500).json({ message: 'Server error' });
  }
});



// Merged /success route handler
app.get('/success', async (req, res) => {
  const reference = req.query.reference; // Get transaction reference from query params
  const amount = parseFloat(req.query.amount); // Get amount from query params
  const userId = req.session.userId; // Assume you're using sessions to track logged-in users

  // Basic validation of input parameters
  if (!userId || !reference || isNaN(amount)) {
      return res.status(400).send('Invalid request parameters');
  }

  try {
      // Find the user by ID from the session
      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).send('User not found');
      }

      // Check if the transaction has already been processed
      const existingTransaction = await Transaction.findOne({ reference });
      if (existingTransaction) {
          return res.status(400).send('Transaction already processed.');
      }

      // Log the new transaction
      const newTransaction = new Transaction({
          userId: userId,
          amount: amount,
          reference: reference,
          type: 'deposit',
          date: new Date(),
          status: 'approved' // Assuming the transaction is approved on success
      });
      await newTransaction.save();

      // Update the user's balance
      user.capital += amount; // Add the deposited amount to the user's capital
      await user.save(); // Save the updated user data to the database

      // Log the transaction for debugging
      console.log(`User: ${JSON.stringify(user)}, Amount: ${amount}, Reference: ${reference}`);

      // Render the success page with updated user data
      res.render('success', {
          user: user.username,  // Use the username property to display the user's name
          balance: user.capital, // Send the updated balance
          amount: amount, // Send the deposited amount
          reference: reference // Send the transaction reference
      });
  } catch (err) {
      console.error('Error handling success:', err);
      res.redirect('/error'); // Redirect to an error page if something goes wrong
  }
});
app.get('/verify', async (req, res) => {
  const { reference } = req.query;

  try {
    const verifyResponse = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      }
    });

    const verifyData = verifyResponse.data.data;

    if (verifyData.status === 'success') {
      const user = await User.findOne({ email: verifyData.email });
      if (user) {
        user.capital += verifyData.amount / 100; // Convert from kobo to NGN
        await user.save();

        const newTransaction = new Transaction({
          userId: user._id,
          type: 'deposit',
          amount: verifyData.amount / 100,
          reference: verifyData.reference,
          status: 'completed'
        });

        await newTransaction.save();

        res.render('deposit-success.ejs', { title: 'Deposit Successful', amount: verifyData.amount / 100 });
      } else {
        res.status(404).send('User not found.');
      }
    } else {
      res.status(400).send('Transaction failed.');
    }
  } catch (error) {
    console.error('Error verifying deposit:', error);
    res.status(500).send('An error occurred while verifying the deposit.');
  }
});

// Schedule the job to run every minute
cron.schedule('0 0 * * *', async () => { // Runs at midnight every day
  try {
    const users = await User.find();
    for (const user of users) {
      if (user.email && user.yourName) { // Ensure required fields are present
        const dailyIncrease = user.capital * 0.005; // 0.5% of the capital
        user.profit += dailyIncrease; // Increase the profit by 0.5% of the capital
        
        console.log(`User: ${user.email}, Capital: ${user.capital}, Daily Increase: ${dailyIncrease}`);
        await user.save();
      } else {
        console.warn(`User with ID ${user._id} is missing required fields.`);
      }
    }
    console.log('Daily profit increase applied to all users');
  } catch (error) {
    console.error('Error applying daily profit increase:', error);
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error.ejs', { title: 'Error', message: 'Internal Server Error', stack: err.stack });
});
// Start the server
app.listen(port, () => console.log(`Server listening on port ${port}`));


