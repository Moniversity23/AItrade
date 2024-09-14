const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  yourName: { type: String },
  role: { type: String, default: 'user' },
  capital: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },

});

const User = mongoose.model('User', userSchema);

 
module.exports = User
