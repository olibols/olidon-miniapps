const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json()); // json body parsing
app.use(express.static(path.join(__dirname, '../public')));  // serve the static frontend

// fake API handling the form submission
app.post('/api/submit-link', (req, res) => {
  const { link } = req.body;

  if (!link) {
    return res.status(400).json({ error: "no link provided" });
  }

  // imagine doing something cool with the link...
  console.log(`got a link: ${link}`);

  // Send back some quasi-successful response
  res.json({ success: true, message: `link received: ${link}`, processedLink: link.toUpperCase() }); // just manipulating it to fake doing something
});

app.listen(PORT, () => console.log(`server is now running on port ${PORT}`));