require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser=require("body-parser");
const dns=require("node:dns");
const urlparser=require("url");
const mongoose=require("mongoose");
mongoose.connect(process.env.DB_URL).then(()=>console.log("connected to DB"));


// Basic Configuration
const port = process.env.PORT || 3000;

const URLSchema=new mongoose.Schema({
  original_url:{
    type:String,
    required:true
  },
  shorturl:{
    type:String,
    required:true
  }

})
let URLModel=mongoose.model("url",URLSchema);

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));
app.use(express.urlencoded({extended:true}));
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.post("/api/shorturl",(req,res)=>{
  let url=req.body.url;
  try{
     let urlObj=new URL(url);
     dns.lookup(urlObj.hostname,(err,address,family)=>{
      if(!address){
        res.json({error:"invalid url"});
      }
      else{
        let original_url=urlObj.href;
        URLModel.findOne({original_url:original_url}).then((foundURL)=>{
          if(foundURL){
            res.json({
              original_url:foundURL.original_url,
              shorturl:foundURL.shorturl
            })
          }
          else{
            let shorturl=1;
            URLModel.find({}).sort({shorturl:"desc"}).limit(1).then((latestURL)=>{
              if(latestURL.length>0){
                shorturl=parseInt(latestURL[0].shorturl)+1;
              }
              let resObj={
                original_url:original_url,
                shorturl:shorturl
              }
              let newURL=new URLModel(resObj);
              newURL.save();
              res.json(resObj);
    
            })
            

          }

        })




        // let original_url=urlObj.href;
       
        
      }

     })
  }
  catch(err){
    res.json({
      error:"invalid url"
    })

  }
})

app.get("/api/shorturl/:short_url",(req,res)=>{
  let shorturl=req.params.short_url;
  URLModel.findOne({shorturl:shorturl}).then((foundURL)=>{
    if(foundURL){
      let original_url=foundURL.original_url;
      res.redirect(original_url);

    }
    else{
      res.json({message:"short url doesnt exist"})
    }  
  })
  
})


// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
