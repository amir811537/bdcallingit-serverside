const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();

// amirhossainbc75
// sHiKJoo3fAljOTPP

// midewaare
const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

const port = process.env.PORT || 5000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3yb9d5d.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri)
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

    const productCollection = client.db("productDB").collection("products");
    const brandCollection = client.db("productDB").collection("brand");
    const reviewCollection = client.db("productDB").collection("allRewiews");
    const profileCollection = client.db("productDB").collection("profileInfo");

    // user collection
    const usercollection = client.db("productDB").collection("user");

    //ADDING PRODUCTS
    app.post("/products", async (req, res) => {
      const product = req.body;
      // console.log('get product',product)
      const result = await productCollection.insertOne(product);
      res.send(result);
    });

    // //getting products
    // app.get("/products", async (req, res) => {
    //   const cursor = productCollection.find();
    //   const result = await cursor.toArray();
    //   res.send(result);
    // });

    app.get("/products", async (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 12;
      const skip = (page - 1) * limit;

      // Construct filter based on query parameters
      const filter = {};
      if (req.query.type) {
        filter.type = { $regex: req.query.type, $options: "i" };
      }
      if (req.query.name) {
        filter.name = { $regex: req.query.name, $options: "i" };
      }

      try {
        const cursor = productCollection.find(filter).skip(skip).limit(limit);
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    //getting brand
    app.get("/brand", async (req, res) => {
      const cursor = brandCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/products/type/:type", async (req, res) => {
      const type = req.params.type;
      // console.log(`Received request for type: ${type}`);

      try {
        const query = { type: new RegExp(`^${type}$`, "i") };
        const cursor = productCollection.find(query);
        const result = await cursor.toArray();

        if (result.length === 0) {
          // console.log("No products found for type:", type);
          return res.status(404).send({ message: "No products found." });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // get singel product by id
    app.get("/productsbyid/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    // updated a products
    app.put("/products/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedProduct = req.body;
      const product = {
        $set: {
          photourl: updatedProduct.photourl,
          brandname: updatedProduct.brandname,
          name: updatedProduct.name,
          price: updatedProduct.price,
          rating: updatedProduct.rating,
          type: updatedProduct.type,
        },
      };
      const result = await productCollection.updateOne(
        filter,
        product,
        options
      );
      res.send(result);
    });

    // delete a data
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });
    //user related api post
    app.post("/userCart", async (req, res) => {
      const user = req.body;
      const result = await usercollection.insertOne(user);
      res.send(result);
    });

    // // cart view
    //     app.get('/userCart',async(req,res)=>{
    //       const email=req.query.email;
    //       const query={
    //         email:email
    //       }
    //       const result =await usercollection.find().toArray();
    //       res.send(result)
    //     })
    //  user get with email and products
    app.get("/userCart/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const cursor = usercollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    //  user delete
    app.delete("/userCart/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usercollection.deleteOne(query);
      res.send(result);
    });

    // user review api
    app.post("/allRewiews", async (req, res) => {
      const { reviewID, userEmail } = req.body.allReviewData;
      try {
        const existingReview = await reviewCollection.findOne({
          "reviewData.reviewID": reviewID,
          "reviewData.userEmail": userEmail,
        });

        if (existingReview) {
          return res
            .status(400)
            .send({ message: "You already added your review" });
        }

        const result = await reviewCollection.insertOne({
          reviewData: req.body.allReviewData,
        });

        res.send(result);
      } catch (error) {
        console.error("Error inserting review:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.post("/updateReviewReaction", async (req, res) => {
      const { reviewId, reaction } = req.body; // reaction can be 'like' or 'dislike'
      try {
        // Define the update operation based on the reaction
        const update =
          reaction === "like"
            ? { $inc: { "reviewData.likes": 1 } }
            : { $inc: { "reviewData.dislikes": 1 } };

        // Update the review document in the database
        const result = await reviewCollection.updateOne(
          { _id: new ObjectId(reviewId) },
          update
        );

        // Check if the review was found and updated
        if (result.modifiedCount > 0) {
          res.send({ success: true });
        } else {
          res.status(400).send({ success: false, message: "Review not found" });
        }
      } catch (error) {
        console.error("Error updating review reaction:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    // get all reviews
    app.get("/allRewiews", async (req, res) => {
      const cursor = reviewCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // make admin apis
    app.patch("/profileInfo/admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDocs = {
        $set: {
          role: "admin",
        },
      };
      const result = await profileCollection.updateOne(query, updatedDocs);
      res.send(result);
    });


    //user profile related api post
    app.post("/profileInfo", async (req, res) => {
      const profileInfo = req.body;
      const result = await profileCollection.insertOne(profileInfo);
      res.send(result);
    });


    //getting all profile info
    app.get("/profileInfo", async (req, res) => {
      const cursor = profileCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // delete profile
    app.delete("/profileInfo/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await profileCollection.deleteOne(query);
      res.send(result);
    });

    // check by email isAdmin
    app.get("/profileInfo/admin/:email", async (req, res) => {
      const clientEmail = req.params.email;
      // console.log(email)
      const query = { email: clientEmail };
      const profile = await profileCollection.findOne(query);
      let admin;
      if (profile) {
        admin = profile.role === "admin";
      }
      console.log(admin);
      res.send({ admin });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
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
  res.send("Crud is running...");
});

app.listen(port, () => {
  console.log(`Simple Crud is Running on port ${port}`);
});
