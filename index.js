const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const ejs = require('ejs');

const app = express();
const PORT = process.env.PORT || 3000;

const TEMP_DIR = path.join(__dirname, 'temp');

// Create the temporary directory if it doesn't exist
fs.mkdir(TEMP_DIR, { recursive: true }).catch(err => console.error(err));

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Set up Multer for file uploads
const storage = multer.diskStorage({
  destination: TEMP_DIR,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage: storage });

// Cleanup function to remove old files from the temporary directory
const cleanup = async () => {
  const files = await fs.readdir(TEMP_DIR);

  for (const file of files) {
    const filePath = path.join(TEMP_DIR, file);
    const stat = await fs.stat(filePath);

    // Check if the file was created more than 5 minutes ago
    if (Date.now() - stat.ctimeMs > 5 * 60 * 1000) {
      await fs.unlink(filePath);
      console.log(`Removed old file: ${file}`);
    }
  }
};

// Schedule the cleanup every 5 minutes
setInterval(cleanup, 5 * 60 * 1000);

// Serve HTML form for file upload
app.get('/', (req, res) => {
  res.render('index');
});

// Handle file upload
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  // Generate a unique link based on the file name
  const uniqueLink = `/download/${req.file.filename}`;

  // Render the success view with the unique link
  res.render('success', { link: uniqueLink });
});

// Serve file for download
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(TEMP_DIR, filename);

  fs.readFile(filePath)
    .then(data => {
      // Set appropriate headers for download
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(data);
    })
    .catch(err => {
      console.error(err);
      res.status(404).send('File not found.');
    });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
