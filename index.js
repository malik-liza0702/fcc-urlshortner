
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dns = require('node:dns');

console.log('MONGO_URI:', process.env.DB_URL);

mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected...'))
  .catch(err => console.error('MongoDB connection error:', err));

// Basic Configuration
const port = process.env.PORT || 3000;

const URLSchema = new mongoose.Schema({
  original_url: { type: String, required: true, unique: true },
  short_url: { type: String, required: true, unique: true }
});

let URLModel = mongoose.model("url", URLSchema);

// Middleware function to parse post requests
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get('/api/shorturl/:short_url', function (req, res) {
  let short_url = req.params.short_url;
  // Find the original url from the database
  URLModel.findOne({ short_url: short_url }).then((foundURL) => {
    if (foundURL) {
      let original_url = foundURL.original_url;
      res.redirect(original_url);
    } else {
      res.json({ error: "The short URL does not exist!" });
    }
  }).catch(err => {
    res.json({ error: "An error occurred" });
  });
});

app.post('/api/shorturl', function (req, res) {
  let url = req.body.url;
  // Validate the URL
  try {
    let urlObj = new URL(url);
    // Validate DNS Domain
    dns.lookup(urlObj.hostname, (err, address, family) => {
      // If the DNS domain does not exist, no address returned
      if (err || !address) {
        res.json({ error: 'invalid url' });
      } 
      else {
        let original_url = urlObj.href;
        // Check that URL does not already exist in database 
        URLModel.findOne({ original_url: original_url }).then(foundURL => {
          if (foundURL) {
            res.json({
              original_url: foundURL.original_url,
              short_url: foundURL.short_url
            });
          } 
          else {
            // Generate a new short URL
            URLModel.find({}).sort({ short_url: 'desc' }).limit(1).then(latestURL => {
              let short_url = latestURL.length > 0 ? parseInt(latestURL[0].short_url) + 1 : 1;
              let resObj = {
                original_url: original_url,
                short_url: short_url.toString()
              };

              // Create an entry in the database
              let newURL = new URLModel(resObj);
              newURL.save().then(() => {
                res.json(resObj);
              }).catch(err => {
                res.json({ error: "An error occurred while saving to the database" });
              });
            }).catch(err => {
              res.json({ error: "An error occurred while finding the latest short URL" });
            });
          }
        }).catch(err => {
          res.json({ error: "An error occurred while checking the original URL" });
        });
      }
    });
  } catch {
    res.json({ error: 'invalid url' });
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});