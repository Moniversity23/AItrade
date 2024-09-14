const mongoose = require('mongoose');

// Replace with your actual MongoDB connection string
const connectionString = 'mongodb+srv://promzy:promise081@cluster0.4bcg3hi.mongodb.net/AItrade?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true })
 .then(() => console.log('Connected to MongoDB'))
 .catch(err => console.error(err));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  yourName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  capital: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  role: { type: String, default: 'user' },
});

const User = mongoose.model('User', userSchema);

// Replace 'your-username' with the actual username of the user you want to add money to
const username = 'promzy2';

User.findOne({ username })
 .then(user => {
    if (user) {
      // Replace '100' with the amount of money you want to add to the user's account
      user.capital += 1000000;
      return user.save();
    } else {
      console.error('User not found');
    }
  })
 .then(() => {
    console.log('Money added successfully');
    mongoose.connection.close();
  })
 .catch(err => {
    console.error('Error adding money:', err);
    mongoose.connection.close();
  });