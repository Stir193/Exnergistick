
// Simple Express server for Exnergistick
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Exnergistick Backend Running ✅');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
