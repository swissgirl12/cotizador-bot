const express = require("express");

const app = express();

// Health check route
app.get("/", (req, res) => {
  res.send("Cotizador server is running ✅");
});

// IMPORTANT: Railway provides the PORT
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
