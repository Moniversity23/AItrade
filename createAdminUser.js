const mongoose = require('mongoose');
const { Admin } = require('./models/user');  // Assuming user.js is in the models directory
const bcrypt = require('bcrypt'); // For password hashing

// Your database connection string (replace with your actual connection details)
const connectionString = 'mongodb+srv://promzy:promise081@cluster0.4bcg3hi.mongodb.net/AItrade?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(connectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('Database connected successfully!');

  const hashedPassword = await bcrypt.hash('promise081', 10); // Hash the password
  const adminUser = new Admin({
    username: 'admin',
    password: hashedPassword,
    role: 'admin'
  });

  try {
    await adminUser.save();
    console.log('Admin user created successfully!');
  } catch (err) {
    console.error(err);
  }
})
.catch(err => console.error(err));

