const express = require("express");
const app = express();
const SSLCommerzPayment = require('sslcommerz-lts')
const port = process.env.PORT || 5000;


const cors = require("cors");
require("dotenv").config();

app.use(
  cors({
    origin: ["http://localhost:5173", "https://oyon-be57d.web.app"],
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

// .........Bikash-payment-gatway..........
const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASS;
const is_live = false; //true for live, false for sandbox

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersCollection = client.db("Ecommerce").collection("users");
    const productsCollection = client.db("Ecommerce").collection("products");
    const oderCollection = client.db("Ecommerce").collection("oders");
    const cartCollection = client.db("Ecommerce").collection("carts");
    const bannerImgCollection = client.db("Ecommerce").collection("banner-images");

    // users post collection api //
    app.post("/users", async (req, res) => {
      const userData = req.body;

      const query = { email: userData.email };
      const exitingUser = await usersCollection.findOne(query);
      if (exitingUser) {
        return res.send({ message: "user already exits", instertedId: null });
      }
      const result = await usersCollection.insertOne(userData);

      res.send(result);
    });

    // user get collection api //
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();

      res.send(result);
    });

    // delete one user 
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      try {
        const result = await usersCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error("Failed to delete user:", error);
        res.status(500).send({ message: "Failed to delete user", error });
      }
    });


    // -------------admin panel related API----------------

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      res.send({ admin: user?.role === "admin" });
    });

    app.get("/users/seller/:email", async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
      const user = await usersCollection.findOne(query);

      let seller = false;
      if (user) {
        seller = user.role === "seller";
      }

      res.send({ seller });
    });


    //----------Products Related API-------------

    // products post collection api
    app.post("/add-products", async (req, res) => {
      const productsData = req.body;
      const result = await productsCollection.insertOne(productsData);

      res.send(result);
    });

    // product get collection api
    app.get("/products", async (req, res) => {
      const result = await productsCollection.find().toArray();

      res.send(result);
    });

    // search api 
    app.get('/products', async (req, res) => {
      const searchTerm = req.query.search || "";

      // MongoDB regex দিয়ে title ফিল্টার
      const products = await productsCollection.find({
        title: { $regex: searchTerm, $options: "i" }
      });

      res.json(products);
    });

    //   product get id api
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    // delete one product
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    // update product
    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const updatedFields = req.body;

      if (!updatedFields || Object.keys(updatedFields).length === 0) {
        return res.status(400).send({ message: "No fields to update" });
      }

      const query = { _id: new ObjectId(id) };
      const updateDoc = { $set: updatedFields };

      try {
        const result = await productsCollection.updateOne(query, updateDoc);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Product not found" });
        }

        res.send({
          message: "Product updated successfully",
          modifiedCount: result.modifiedCount,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to update product", error });
      }
    });


    // product search api
    app.get('/search', async (req, res) => {
      const searchTerm = req.query.q;

      try {
        let query = {
          $or: [
            { title: { $regex: searchTerm, $options: 'i' } },
            { category: { $regex: searchTerm, $options: 'i' } },
            { brand: { $regex: searchTerm, $options: 'i' } }
          ]
        };

        // If valid ObjectId, also include _id match
        if (isValidObjectId(searchTerm)) {
          query.$or.push({ _id: new ObjectId(searchTerm) });
        }

        const results = await productsCollection.find(query).toArray();

        res.send(results);
      } catch (err) {
        console.error('Search error:', err);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });



    //-------------Banner Related API----------------

    //Banner all data get api 
    app.get('/bannerImgs', async (req, res) => {
      const result = await bannerImgCollection.find().toArray()
      res.send(result)
    })

    // Banner post api 
    app.post('/bannerImg', async (req, res) => {
      const bannerImgLink = req.body;

      // Simple validation: check if there's a property like 'url' or any data
      if (!bannerImgLink || Object.keys(bannerImgLink).length === 0) {
        return res.status(400).send({ acknowledged: false, message: "Banner image data is required" });
      }

      try {
        const result = await bannerImgCollection.insertOne(bannerImgLink);

        res.send({ acknowledged: true, insertedId: result.insertedId });
      } catch (error) {
        // console.error("Error inserting banner image:", error);
        res.status(500).send({ acknowledged: false, message: "Server error" });
      }
    });

    // Banner delete Api
    app.delete('/bannerImg/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await bannerImgCollection.deleteOne(query)
      res.send(result)
    })




    //..........orders api.................

    // Utility: check if valid ObjectId
    const isValidObjectId = (id) => {
      return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
    };

    // Search API
    app.get("/search", async (req, res) => {
      const searchTerm = req.query.q;

      if (!searchTerm) {
        return res.status(400).send({ message: "Search term is required" });
      }

      try {
        let query = {
          $or: [
            { title: { $regex: searchTerm, $options: "i" } },
            { category: { $regex: searchTerm, $options: "i" } },
            { brand: { $regex: searchTerm, $options: "i" } }
          ]
        };

        // If valid ObjectId, also include _id match
        if (isValidObjectId(searchTerm)) {
          query.$or.push({ _id: new ObjectId(searchTerm) });
        }

        const results = await productsCollection.find(query).toArray();

        res.send(results);
      } catch (err) {
        console.error("Search error:", err);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });


    //..............PAYMENT GATEWAY INT............
    const tran_id = new ObjectId().toString()

    app.post('/order', async(req,res)=>{
      const product = await productsCollection.findOne({_id:new ObjectId(req.body.productId)})
      // console.log(product)

    app.post('/order', async (req, res) => {
      const product = await productsCollection.findOne({ _id: new ObjectId(req.body.productId) })

      const order = req.body
      const data = {
        total_amount: product?.price,
        currency: order?.currency,
        tran_id: tran_id, // use unique tran_id for each api call
        success_url: `https://gadgetzone-server.onrender.com/payment/success/${tran_id}`,
        fail_url: `https://gadgetzone-server.onrender.com/payment/fail/${tran_id}`,
        cancel_url: 'http://localhost:3030/cancel',
        ipn_url: 'http://localhost:3030/ipn',
        shipping_method: 'Courier',
        product_name: 'Computer.',
        product_category: 'Electronic',
        product_profile: 'general',
        cus_name: order?.name,
        cus_email: 'customer@example.com',
        cus_add1: order?.address,
        cus_add2: 'Dhaka',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: order?.phone,
        cus_fax: '01711111111',
        ship_name: 'Customer Name',
        ship_add1: 'Dhaka',
        ship_add2: 'Dhaka',
        ship_city: 'Dhaka',
        ship_state: 'Dhaka',
        ship_postcode: 1000,
        ship_country: 'Bangladesh',
      };

      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
      sslcz.init(data).then(apiResponse => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL
        res.send({ url: GatewayPageURL })
        const finalOrder = {
          product, paidStatus: false, tranjectionId: tran_id
        }
        const result = oderCollection.insertOne(finalOrder)
 
      });

    })

    app.post('/payment/success/:tranId', async (req, res) => {
     
      const result = await oderCollection.updateOne(
        { tranjectionId: req.params.tranId },
        {
          $set: {
            paidStatus: true
          }
        }
      )
      if (result.modifiedCount > 0) {
        res.redirect(`https://e-commerce-4e765.web.app/payment/success/${req.params.tranId}`)
      }

    })
     if(result.modifiedCount>0){
      res.redirect(`https://oyon-be57d.web.app/payment/success/${req.params.tranId}`)
     }
    //  if(result.modifiedCount>0){
    //   res.redirect(`http://localhost:5173/payment/success/${req.params.tranId}`)
    //  }
    })


    app.post('/payment/fail/:tranId',async(req,res)=>{
      const result = await oderCollection.deleteOne({tranjectionId:req.params.tranId})
      if(result.deletedCount){
        res.redirect(`https://oyon-be57d.web.app/payment/fail/${req.params.tranId}`)
      }
    //   if(result.deletedCount){
    //     res.redirect(`http://localhost:5173/payment/fail/${req.params.tranId}`)

    // }
  })


    app.post('/payment/fail/:tranId', async (req, res) => {
      const result = await oderCollection.deleteOne({ tranjectionId: req.params.tranId })
      if (result.deletedCount) {
        res.redirect(`https://e-commerce-4e765.web.app/payment/fail/${req.params.tranId}`)

      }
    })









    // ......ADD TO CART.....
    
    app.post("/cart", async (req, res) => {
      const items = req.body;

      if (!items.userEmail || !items.productId) {
        return res.status(400).send({ acknowledged: false, message: "Missing userEmail or productId" });
      }

      try {
        const existing = await cartCollection.findOne({
          userEmail: items.userEmail,
          productId: items.productId,
        });

        if (existing) {
          return res.send({ acknowledged: false, message: "Product already in cart" });
        }

        const result = await cartCollection.insertOne(items);
        return res.send({ acknowledged: true, insertedId: result.insertedId });
      } catch (error) {
        console.error(error);
        return res.status(500).send({ acknowledged: false, message: "Server error" });
      }
    });

    // delete cart product
    app.delete("/deleteCart/:id", async (req, res) => {
      const id = req.params.id;

      if (!id) {
        return res.status(400).send({ acknowledged: false, message: "Missing id" });
      }

      try {
        const result = await cartCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 1) {
          res.send({ acknowledged: true, message: "Deleted successfully" });
        } else {
          res.status(404).send({ acknowledged: false, message: "Item not found" });
        }
      } catch (error) {
        console.error("Error deleting cart item:", error);
        res.status(500).send({ acknowledged: false, message: "Server error" });
      }
    });


    //get all cart products
    app.get("/all-carts", async (req, res) => {
      const allItems = req.body;
      const result = await cartCollection.find().toArray();
      res.send(result);
    });

    app.get("/carts", async (req, res) => {
      const email = req.query.email;

      if (!email) {
        return res
          .status(400)
          .send({ message: "Email query parameter is required" });
      }

      try {
        const result = await cartCollection
          .find({ userEmail: email })
          .toArray();
        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to fetch cart items" });
      }
    });


    // ..............user,admin,seller profile api...............
    app.get('/users/profile/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email }
        const user = await usersCollection.findOne(query)
        if (user) {
          res.send(user)
        }
        else {
          res.status(404).send({ message: 'user is not data found ' })
        }
      } catch (error) {
        res.status(500).send({ message: 'Error fetching user profile', error })
      }
    })

    // user update api.......................
    app.put('/update/:id', async (req, res) => {
      const id = req.params.id;
      const userData = req.body;

      if (!userData.name || !userData.email || !userData.photo) {
        return res.status(400).send({
          success: false,
          message: 'Missing required fields: name, email, or photo',
        });
      }

      try {
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            name: userData.name,
            email: userData.email,
            photo: userData.photo,
          }
        };
  

        const result = await usersCollection.updateOne(query, updateDoc);
        const updatedUser = await usersCollection.findOne(query);

        if (result.modifiedCount > 0) {
          res.send({
            success: true,
            message: 'Profile updated successfully!',
            user: updatedUser
          });
        } else {
          res.send({
            success: false,
            message: 'No changes were made.'
          });
        }
      } catch (error) {
        console.error('Update Error:', error);
        res.status(500).send({
          success: false,
          message: 'Failed to update profile',
          error: error.message
        });
      }
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
