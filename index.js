const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
require("dotenv").config();

app.use(
  cors({
    origin: ["http://localhost:5173", "https://gadzetzone-be819.web.app"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.u2fu7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersCollection = client.db("Ecommerce").collection("users");
    const productsCollection = client.db("Ecommerce").collection("products");

    // users post collection api
    app.post("/users", async (req, res) => {
      const userData = req.body;

      const query = { email: userData.email };
      const exitingUser = await usersCollection.findOne(query);
      if (exitingUser) {
        return res.send({ message: "user already exits", instertedId: null });
      }
      const result = await usersCollection.insertOne(userData);
      console.log(result);
      res.send(result);
    });

    // user get collection api
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      console.log(result);
      res.send(result);
    });

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      res.send({ admin: user?.role === "admin" });
    });

     app.get('/users/seller/:email', async (req, res) => {
      const email = req.params.email;
      // console.log('Decoded email:', req.decoded?.email);
      // console.log('Request email:', email);
      // if (!req.decoded || email !== req.decoded.email) {
      //   return res.status(403).send({ message: 'Forbidden access' });
      // }
    
      const query = { email: email };
      const user = await usersCollection.findOne(query);
    
      let seller = false;
      if (user) {
       seller = user.role === 'seller';
      }
    
      res.send({ seller});
    });

    // products post collection api
    app.post("/add-products", async (req, res) => {
      const productsData = req.body;
      const result = await productsCollection.insertOne(productsData);
      console.log(result);
      res.send(result);
    });

    // product get collection api
    app.get("/products", async (req, res) => {
      const result = await productsCollection.find().toArray();
      console.log(result);
      res.send(result);
    });

    //   product get id api
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.find(query).toArray();
      console.log(result);
      res.send(result);
    });

    // delete one product
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("E-commerce api loading..............!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
