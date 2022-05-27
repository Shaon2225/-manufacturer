const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require('jsonwebtoken');
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { default: Stripe } = require("stripe");
const strip = require('stripe')(process.env.STRIPE_API_KEY);

app.use(cors());
app.use(express.json());


//======================= FOR STRIPE ====================



//======================= Varify JWT =====================
const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
      if (err) {
        return res.status(403).send({ message: 'Forbidden access' })
      }
      req.decoded = decoded;
      next();
    });
  }


// ======================makign db connection===============

const uri = `mongodb+srv://${process.env.db_ADMIN}:${process.env.db_PASS}@cluster0.zmmee.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
client.connect((err) => {
  const collection = client.db("test").collection("devices");
});

const run = async () => {
  try {
    await client.connect();

    const adminCollection = client.db("voltlab").collection("admin");
    const productCollection = client.db("voltlab").collection("product");
    const userCollection = client.db("voltlab").collection("users");
    const reviewCollection = client.db("voltlab").collection("Reviews");
    const orderCollection = client.db("voltlab").collection("orders");

    app.put('/user/:email', async(req,res)=>{
        const email = req.params.email;
        const user = req.body;
        const filter = {email};
        const option = {upsert: true};
        const updateDoc = {
            $set : user
        };
        const result = await userCollection.updateOne(filter,updateDoc,option);
        const token =jwt.sign({email},process.env.ACCESS_TOKEN_SECRET,{expiresIn:'1d'});
        res.send({result,token});
    })

    //================================= update user profile

    app.put('/userupdate/:email',verifyJWT, async(req,res)=>{
      const email = req.params.email;
      const user = req.body;
      const filter ={email};
      const option = {upsert:true};
      const updateDoc = {
        $set: user
      };
      const result = await userCollection.updateOne(filter,updateDoc,option);
      res.send(result);
    })

    // ================================= get user profile
    app.get('/userprofile/:email', async(req,res)=>{
      const email = req.params.email;
      const query = {email};
      const result = await userCollection.findOne(query);
      res.send(result);
    })

    // ===================================get all users
    app.get('/allusers',async(req,res)=>{
      const query= {};
      const result = await userCollection.find(query).toArray();
      res.send(result);
    })

    //================================== delete user
    app.delete('/allusers/dlt/:email',verifyJWT,async(req,res)=>{
      const email = req.params.email;
      const query ={email};
      const result = userCollection.deleteOne(query);
      res.send(result);
    })

    //================================= make admin
    app.post('/allusers/makeadmin/:email', verifyJWT , async(req,res)=>{
      const email = req.params.email;
      const query=req.body;
      const filter = {email};
      const option = {upsert:true};
      const updateDoc = {
        $set: {...query,role:'admin'}
      };
      const result1 =await userCollection.updateOne(filter,updateDoc,option);
      const result = await adminCollection.insertOne(query);
      res.send(result);
    })

    //================================= get admin
    app.get('/admin/:email', verifyJWT, async (req,res)=>{
      const email = req.params.email;
      const query ={email};
      const result = await adminCollection.findOne(query);
      res.send(result);
    })

    //================================= add product
    app.post('/addproduct', verifyJWT , async(req,res)=>{
      const query = req.body;
      const result = await productCollection.insertOne(query);
      res.send(result);
    })

    //================================== get all products
    app.get('/allproducts', async(req,res)=>{
      const query={};
      const result = await productCollection.find(query).toArray();
      res.send(result);
    })

    //=================================== dlt product
    app.delete('/allproducts/dlt/:id',verifyJWT,async(req,res)=>{
      const id= req.params.id;
      const query={_id:ObjectId(id)};
      const result = await productCollection.deleteOne(query);
      res.send(result);
    })

    //=================================== get single product
    app.get('/allproducts/:id',async(req,res)=>{
      const id = req.params.id;
      const query={_id:ObjectId(id)};
      const result = await productCollection.findOne(query);
      res.send(result);
    })

    //=================================== place order
    app.post('/allproducts/palceorder',verifyJWT,async(req,res)=>{
      const query = req.body;
      const result = await orderCollection.insertOne(query);
      res.send(result);
    })
    

    //================================== get all orders by individual user
    app.get('/allorders/:email',verifyJWT, async(req,res)=>{
      const email = req.params.email;
      const query = {email};
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    })

    //================================== get order by id
    app.get('/order/:id',verifyJWT,async(req,res)=>{
      const id = req.params.id;
      const query = {_id:ObjectId(id)};
      const result = await orderCollection.findOne(query);
      res.send(result);
    })
    //================================== dlt order
    app.delete('/allorders/dlt/:id',verifyJWT,async(req,res)=>{
      const id = req.params.id;
      const query = {_id:ObjectId(id)};
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    })


    //=============================== update after payment
    app.put('/order/makepayment/:id',verifyJWT,async(req,res)=>{
      const id= req.params.id;
      const filter= {_id:ObjectId(id)};
      const option = {upsert:true};
      const updateDoc={
        $set:{payment:'paid'}
      }
      const result = await orderCollection.updateOne(filter,updateDoc,option);
      res.send(result);
    })


    //=============================== for payment
    app.post('/create-payment-intent',verifyJWT, async(req,res)=>{
      const {price}=req.body;
      const paymentIntent = await Stripe.paymentIntents.create({
        amount: price,
        currency: 'usd',
        payment_method_types:['card']

      });
      res.send({clientSecret: paymentIntent.client_secret});
    })

  } finally {
  }
};

run().catch(console.dir);



app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
