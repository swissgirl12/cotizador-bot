const express = require("express");
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("Cotizador server is running ✅");
});

// MAIN ENDPOINT
app.post("/generate-pdf", async (req, res) => {
  const { guests } = req.body;

  if (!guests) {
    return res.status(400).json({ error: "guests is required" });
  }

  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto(
      "https://cabanasuiza-cotizador.proavant.net/Cotizaciones.php?src=4",
      { waitUntil: "networkidle" }
    );

    // ⚠️ This selector MUST be verified
    await page.fill('input[name="personas"]', String(guests));

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.click("text=Cotiza tu evento aquí"),
    ]);

    const fileName = `cotizacion-${Date.now()}.pdf`;
    const filePath = path.join(__dirname, fileName);

    await download.saveAs(filePath);
    await browser.close();

    // Temporary public serving
    res.json({
      success: true,
      message: "PDF generated",
      file: fileName,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "PDF generation failed" });
  }
});

app.use("/files", express.static(__dirname));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
