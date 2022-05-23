const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require("mongodb");

app.use(cors());
app.use(express.json());

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
  } finally {
  }
};

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello From Doctor Uncle!");
});

app.listen(port, () => {
  console.log(`Doctors App listening on port ${port}`);
});
