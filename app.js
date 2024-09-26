const express = require("express");
const nunjucks = require("nunjucks");
const bodyParser = require("body-parser");

const app = express();

// Configure Nunjucks
nunjucks.configure("views", {
  autoescape: true,
  express: app,
});

// Middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.json()); // This middleware is necessary to parse JSON from the body

// GET route to render form
app.get("/", (req, res) => {
  res.render("index.njk");
});

// POST route to handle form submission
app.post("/", async (req, res) => {
  const {
    city,
    jumlah_orang,
    mata_uang,
    budget,
    musim,
    lama_perjalanan,
    tipe_perjalanan,
    transportasi,
  } = req.body;

  try {
    const ragStreamResponse = await fetch("http://localhost:5000/rag_stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city,
        budget,
        mata_uang,
        jumlah_orang,
        musim,
        lama_perjalanan,
        tipe_perjalanan,
        transportasi,
      }),
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = ragStreamResponse.body.getReader();

    async function readStream() {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          break;
        }
        res.write(new TextDecoder().decode(value));
      }
    }

    readStream().catch((error) => {
      console.error("Error reading stream:", error);
      res.status(500).end("Error processing stream");
    });
  } catch (error) {
    console.error("Error fetching from Flask server:", error);
    res.status(500).send("Error fetching from Flask server.");
  }
});

// GET route to render the form for the stream
app.get("/stream", (req, res) => {
  res.render("stream.njk");
});

app.post("/stream", async (req, res) => {
  const flaskStreamResponse = await fetch("http://localhost:5000/stream");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Transfer-Encoding", "chunked");

  const reader = flaskStreamResponse.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let done = false;

  while (!done) {
    const { value, done: streamDone } = await reader.read();
    done = streamDone;

    if (value) {
      const chunkText = decoder.decode(value);
      res.write(chunkText);
    }
  }
  res.end();
});

// Start the server
app.listen(3000, () => {
  console.log("Server is running on http://127.0.0.1:3000");
});
