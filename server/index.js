const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

// serve static built client from react
app.use(express.static(path.join(__dirname, '../client/build')));

app.get('/api/hello', (req, res) => {
  res.json({ message: 'hello world from express' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

app.listen(PORT, () => console.log(`server running on ${PORT}`));