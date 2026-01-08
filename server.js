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

app.post("/generate-pdf", async (req, res) => {
  const { guests } = req.body;

  if (!guests) {
    return res.status(400).json({ error: "guests is required" });
  }

  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
      ],
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Open cotizador
    await page.goto(
      "https://cabanasuiza-cotizador.proavant.net/Cotizaciones.php?src=4",
      {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      }
    );

    // Wait for input field
    await page.waitForSelector(
      'input[placeholder*="Total de invitados"]',
      { timeout: 30000 }
    );

    // Fill guest count
    await page.fill(
      'input[placeholder*="Total de invitados"]',
      String(guests)
    );

    // Click button and wait for new tab (PDF)
    const [pdfPage] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("button", { name: /cotiza tu evento/i }).click(),
    ]);

    await pdfPage.waitForLoadState("networkidle", { timeout: 60000 });

    // Save PDF
    const fileName = `cotizacion-${Date.now()}.pdf`;
    const filePath = path.join(__dirname, fileName);

    await pdfPage.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
    });

    await pdfPage.close();
    await browser.close();

    res.json({
      success: true,
      file: fileName,
      url: `/files/${fileName}`,
    });

  } catch (err) {
    console.error("PLAYWRIGHT ERROR:");
    console.error(err);

    if (browser) await browser.close();

    res.status(500).json({
      error: "PDF generation failed",
      details: err.message,
    });
  }
});

// Serve generated PDFs
app.use("/files", express.static(__dirname));

// Railway port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

