const express = require("express")
const cors = require("cors")
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb")

require("dotenv").config()

const app = express()
const port = process.env.PORT || 5000

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://taj-apart.web.app",
    "https://taj-apart.firebaseapp.com",
  ],
  credentials: true,
  optionSuccessStatus: 200,
}

app.use(cors(corsOptions))
app.use(express.json())

app.get("/", (req, res) => {
  res.send("Welcome to Taj Apart")
})

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
    const announcementCollection = client
      .db("tajApart")
      .collection("announcements")

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
      const email = req.params.email
      const query = { email }
      const result = await userCollection.findOne(query)
      res.send(result)
    })

    // User save and update in db
    app.put("/users", async (req, res) => {
      const user = req.body

      const query = { email: user.email }
      // exist user
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
          res.send(result)
        }
        return res.send(existingUser)
      }

      const options = { upsert: true }
      const updateDoc = {
        $set: {
          ...user,
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

    app.put("/agreements", async (req, res) => {
      const agreement = req.body

      const query = {
        apartment_no: agreement.apartment_no,
      }

      const currentUser = await userCollection.findOne({
        email: agreement?.user.email,
      })
      if (currentUser) {
        const existingAgreement = await agreementCollection.findOne(query)
        if (existingAgreement) return res.send(existingAgreement)
      } else {
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
