const express = require("express");
const dotEnv = require("dotenv");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const app = express();
const port = process.env.PORT || 3000;
const registerDetails = require("./registermodel");
const middleware = require("./middleware");
const cors = require("cors");

dotEnv.config();

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err.message);
    process.exit(1);
  });

app.use(express.json());
app.use(cors({ origin: "*" }));

app.get("/", (req, res) => {
  return res.send("Hello World");
});

app.post("/register", async (req, res) => {
  try {
    const {
      fullname,
      email,
      mobile,
      password,
      confirmpassword,
      usertype,
      secretkey,
      gender,
      permanentAddress,
      course,
      department,
      hostelblock,
      roomno,
      yearOfStudy,
      admissionNumber,
    } = req.body;

    if (
      !fullname ||
      !email ||
      !mobile ||
      !password ||
      !confirmpassword ||
      !usertype
    ) {
      return res.status(400).send("All fields are required");
    }

    const existingUser = await registerDetails.findOne({ email });
    if (existingUser) {
      return res.status(400).send("User already exists");
    }

    if (usertype === "admin") {
      if (secretkey !== "venkatesh") {
        return res
          .status(400)
          .send("Invalid secret key for admin registration");
      }

      // Admin registration logic
      const hashedPassword = await bcrypt.hash(password, 10);

      const newAdmin = new registerDetails({
        usertype,
        secretkey,
        fullname,
        email,
        mobile,
        password: hashedPassword,
        confirmpassword: hashedPassword,

        // Add any other admin-specific fields here
      });

      await newAdmin.save();
    } else if (usertype === "user") {
      // User registration logic
      if (password !== confirmpassword) {
        return res.status(400).send("Passwords do not match");
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new registerDetails({
        usertype,
        fullname,
        email,
        mobile,
        password: hashedPassword,
        confirmpassword: hashedPassword,
        gender,
        permanentAddress,
        course,
        department,
        hostelblock,
        roomno,
        yearOfStudy,
        admissionNumber,
        // Add any other user-specific fields here
      });

      await newUser.save();
    } else {
      return res.status(400).send("Invalid usertype");
    }

    return res.status(200).send("User registered successfully");
  } catch (error) {
    console.error("Server error:", error.message);
    return res.status(500).send("Server error: " + error.message);
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await registerDetails.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const payload = {
      user: {
        id: user.id,
        usertype: user.usertype,
      },
    };

    const secret = process.env.JWT_SECRET || "defaultSecret";
    const expiresIn = 3600;

    jwt.sign(payload, secret, { expiresIn }, (err, token) => {
      if (err) {
        console.error("Error generating token:", err);
        return res.status(500).json({ error: "Server error" });
      }

      // Include usertype in the response
      return res.json({ token, usertype: user.usertype });
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/allprofiles", middleware, async (req, res) => {
  try {
    const data = await registerDetails.find();
    return res.status(200).json({ data });
  } catch (error) {
    console.log("error is", error);
  }
});

app.get("/myprofile", middleware, async (req, res) => {
  try {
    const mydata = await registerDetails.findById(req.user.id);
    return res.status(200).json({ mydata });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Server error" });
  }
});
// ... (existing imports and configurations)

// Add a new endpoint for users to submit complaints
app.post("/dashboard/complaints", middleware, async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res
        .status(400)
        .json({ error: "Title and description are required for a complaint" });
    }

    const user = await registerDetails.findById(req.user.id);

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // Add the complaint to the user's complaints array
    user.complaints.push({ title, description });
    await user.save();

    return res
      .status(200)
      .json({ message: "Complaint submitted successfully" });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// Add an endpoint for users to retrieve their recent complaints
app.get("/dashboard/complaints/recent", middleware, async (req, res) => {
  try {
    const user = await registerDetails.findById(req.user.id);

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // Retrieve the user's recent complaints
    const recentComplaints = user.complaints.slice(-5); // Adjust the number as needed

    return res.status(200).json({ data: recentComplaints });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// Add an endpoint for admin to retrieve all complaints
app.get("/admindashboard/complaints", middleware, async (req, res) => {
  try {
    // Check if the user is an admin
    if (req.user.usertype !== "admin") {
      return res.status(403).json({ error: "Permission denied" });
    }

    // Retrieve all users with their complaints
    const usersWithComplaints = await registerDetails.find(
      {},
      { email: 1, fullname: 1, complaints: 1 }
    );

    return res.status(200).json({
      data: usersWithComplaints.map((user) => ({
        email: user.email,
        fullname: user.fullname,
        complaints: user.complaints,
      })),
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});
app.post("/dashboard/suggestions", middleware, async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res
        .status(400)
        .json({ error: "Title and description are required for a suggestion" });
    }

    const user = await registerDetails.findById(req.user.id);

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // Add the suggestion to the user's suggestions array
    user.suggestions.push({ title, description });
    await user.save();

    return res
      .status(200)
      .json({ message: "Suggestion submitted successfully" });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// Add an endpoint for users to retrieve their recent suggestions
app.get("/dashboard/suggestions/recent", middleware, async (req, res) => {
  try {
    const user = await registerDetails.findById(req.user.id);

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // Retrieve the user's recent suggestions
    const recentSuggestions = user.suggestions.slice(-5); // Adjust the number as needed

    return res.status(200).json({ data: recentSuggestions });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// Add an endpoint for admin to retrieve all suggestions
app.get("/admindashboard/suggestions", middleware, async (req, res) => {
  try {
    // Check if the user is an admin
    if (req.user.usertype !== "admin") {
      return res.status(403).json({ error: "Permission denied" });
    }

    // Retrieve all users with their suggestions
    const usersWithSuggestions = await registerDetails.find(
      {},
      { email: 1, fullname: 1, suggestions: 1 }
    );

    return res.status(200).json({
      data: usersWithSuggestions.map((user) => ({
        email: user.email,
        fullname: user.fullname,
        suggestions: user.suggestions,
      })),
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});
app.delete("/removeprofile/:id", middleware, async (req, res) => {
  try {
    // Check if the user is an admin
    if (req.user.usertype !== "admin") {
      return res.status(403).json({ error: "Permission denied" });
    }

    const userId = req.params.id;

    const removedUser = await registerDetails.findOneAndDelete({ _id: userId });

    if (!removedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ message: "Profile removed successfully" });
  } catch (error) {
    console.error("Server error:", error);
    return res
      .status(500)
      .json({ error: "Server error", details: error.message });
  }
});
// Update the existing /editprofile/:id endpoint
app.put("/editprofile/:id", middleware, async (req, res) => {
  try {
    const userId = req.params.id;
    const updatedData = req.body;

    const updatedUser = await registerDetails.findByIdAndUpdate(
      userId,
      updatedData,
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    return res
      .status(200)
      .json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

app.listen(port, () => {
  console.log(`Server is started at ${port}`);
});
