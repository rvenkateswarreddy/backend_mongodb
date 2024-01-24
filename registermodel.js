const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  usertype: { type: String, required: true },
  secretkey: { type: String, required: false },
  fullname: { type: String, required: false }, // Required only for 'admin'
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  password: { type: String, required: true },
  confirmpassword: { type: String, required: true },
  gender: { type: String, required: false }, // Required only for 'user'
  permanentAddress: { type: String, required: false }, // Required only for 'user'
  course: { type: String, required: false }, // Required only for 'user'
  department: { type: String, required: false },
  hostelblock: { type: String, required: false }, // New field
  roomno: { type: String, required: false }, // New field // Required only for 'user'
  yearOfStudy: { type: String, required: false }, // Required only for 'user'
  admissionNumber: { type: String, required: false },

  complaints: [
    {
      title: { type: String, required: true },
      description: { type: String, required: true },
      status: { type: String, default: "Pending" },
    },
  ],
  suggestions: [
    {
      title: { type: String, required: true },
      description: { type: String, required: true },
      status: { type: String, default: "Pending" },
      date: { type: Date, default: Date.now },
    },
  ],
});

const User = mongoose.model("User", userSchema);

module.exports = User;
