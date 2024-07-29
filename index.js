require("dotenv").config()
const express = require("express")
const cors = require("cors")
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb")
const axios = require("axios")
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)

const app = express()
const port = process.env.PORT || 5000

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://taj-apart.web.app",
    "https://taj-apart.firebaseapp.com",
  ],
  credentials: true,
  optionSuccessStatus: 200,
}

app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded())

app.get("/", (req, res) => {
  res.send("Welcome to Taj Apart")
})
// const uri = "mongodb://localhost:27017/"
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.y3rtmj6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})
async function run() {
  try {
    const apartmentCollection = client.db("tajApart").collection("apartments")
    const userCollection = client.db("tajApart").collection("users")
    const agreementCollection = client.db("tajApart").collection("agreements")
    const couponCollection = client.db("tajApart").collection("coupons")
    const announcementCollection = client
      .db("tajApart")
      .collection("announcements")
    const paymentCollection = client.db("tajApart").collection("payments")

    // Apartments
    app.get("/apartments", async (req, res) => {
      const apartments = await apartmentCollection.find().toArray()
      res.send(apartments)
    })

    app.patch("/apartments/:id", async (req, res) => {})

    // Apartments for pagination
    app.get("/all-apartments", async (req, res) => {
      const page = parseInt(req.query.page) - 1
      const size = parseInt(req.query.size)

      const result = await apartmentCollection
        .find()
        .skip(page * size)
        .limit(size)
        .toArray()
      res.send(result)
    })

    app.get("/apartments-count", async (req, res) => {
      const count = await apartmentCollection.countDocuments()
      res.send({ count })
    })

    // Users
    app.get("/users", async (req, res) => {
      const users = await userCollection.find().toArray()
      res.send(users)
    })

    // User get by email
    app.get("/users/:email", async (req, res) => {
      const user = req.body
      const query = { email: req.params.email }

      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        if (user.role === "member") {
          const result = await userCollection.updateOne(query, {
            $set: { role: user.role },
          })
          return res.send(result)
        }
        if (user.role === "user") {
          const result = await userCollection.updateOne(query, {
            $set: { role: user?.role },
          })
          return res.send(result)
        }
        return res.send(existingUser)
      }

      const result = await userCollection.findOne(query)
      res.send(result)
    })

    // User save and update in db
    app.put("/users", async (req, res) => {
      const user = req.body

      const query = { email: user.email }
      const isExist = await userCollection.findOne(query)
      if (isExist) return res.send(isExist)
      const options = { upsert: true }
      const updateDoc = {
        $set: {
          ...user,
        },
      }

      const postUser = await userCollection.updateOne(query, updateDoc, options)
      res.send(postUser)
    })

    app.put("/users/:email", async (req, res) => {
      const userInfo = req.body

      const query = { email: req.params.email }
      const isUser = await userCollection.findOne(query)
      if (isUser) {
        if (userInfo.role === "member") {
          const result = await userCollection.updateOne(query, {
            $set: { role: userInfo.role },
          })
          return res.send(result)
        }

        if (userInfo.role === "user") {
          const result = await userCollection.updateOne(query, {
            $set: { role: userInfo.role },
          })
          return res.send(result)
        }
      } else {
        return res.send(isUser)
      }

      const options = { upsert: true }
      const updateDoc = {
        $set: {
          ...userInfo,
        },
      }

      const postUser = await userCollection.updateOne(query, updateDoc, options)
      res.send(postUser)
    })

    // Agreements
    app.get("/agreements", async (req, res) => {
      const agreements = await agreementCollection.find().toArray()
      res.send(agreements)
    })

    app.get("/agreements/:email", async (req, res) => {
      const query = { user_email: req.params.email }
      const result = await agreementCollection.findOne(query)
      res.send(result)
    })

    app.put("/agreements", async (req, res) => {
      const agreement = req.body

      const query = {
        apartment_no: agreement.apartment_no,
      }

      const currentUser = await userCollection.findOne({
        email: agreement?.user_email,
      })
      if (currentUser) {
        const existingAgreement = await agreementCollection.findOne(query)
        if (existingAgreement) {
          if (agreement.status === "checked") {
            const result = await agreementCollection.updateOne(
              query,
              {
                $set: {
                  status: agreement.status,
                  accept_date: agreement.accept_date,
                },
              },
              { upsert: true }
            )
            return res.send(result)
          }
          return res.send(existingAgreement)
        }
      }

      const option = { upsert: true }
      const updateDoc = {
        $set: {
          ...agreement,
        },
      }

      const postAgreement = await agreementCollection.updateOne(
        query,
        updateDoc,
        option
      )
      res.send(postAgreement)
    })

    app.delete("/agreements/:id", async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await agreementCollection.deleteOne(query)
      res.send(result)
    })

    // Announcements
    app.get("/announcements", async (req, res) => {
      const result = await announcementCollection.find().toArray()
      res.send(result)
    })

    app.post("/announcements", async (req, res) => {
      const announcement = req.body
      const result = await announcementCollection.insertOne(announcement)
      res.send(result)
    })

    // Coupons
    app.get("/coupons", async (req, res) => {
      const result = await couponCollection.find().toArray()
      res.send(result)
    })

    app.post("/coupons", async (req, res) => {
      const coupon = req.body
      const result = await couponCollection.insertOne(coupon)
      res.send(result)
    })

    app.post("/verify-coupon", async (req, res) => {
      const { code } = req.body
      try {
        const coupon = await couponCollection.findOne({ code })
        if (coupon) {
          return res.send({ valid: true, discount: coupon.discount })
        } else {
          return res.send({ valid: false, message: "Invalid coupon" })
        }
      } catch (error) {
        res.status(500).send({ valid: false, message: "Server error" })
      }
    })

    app.delete("/coupons/:id", async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await couponCollection.deleteOne(query)
      res.send(result)
    })

    // Payments
    app.get("/payments", async (req, res) => {
      const result = await paymentCollection.find().toArray()
      res.send(result)
    })

    app.get("/payments/:email", async (req, res) => {
      const query = { user_email: req.params.email }
      const result = await paymentCollection.find(query).toArray()
      res.send(result)
    })

    app.post("/payments", async (req, res) => {
      const paymentInfo = req.body

      const isUser = await userCollection.findOne({
        email: paymentInfo.user_email,
      })
      if (isUser) {
        const isExist = await paymentCollection.findOne({
          month: paymentInfo.month,
        })
        if (isExist) {
          return res.send({ isExist: true })
        }
      }

      const savePayment = await paymentCollection.insertOne(paymentInfo)
      res.send(savePayment)
    })

    // Payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { total_amount } = req.body
      const amount = parseInt(total_amount * 100)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      })

      res.send({
        clientSecret: paymentIntent.client_secret,
      })
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 })
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    )
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir)

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`)
})
