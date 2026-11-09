import express from "express";
import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';
import { createRemoteJWKSet, jwtVerify } from "jose";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello from the server!");
});

let databaseConnection;
let destinationsCollection;
let bookingsCollection;

const ensureDatabaseConnection = async (req, res, next) => {
    if (!process.env.MONGODB_URL) {
        return res.status(500).json({ message: 'Database configuration is missing.' });
    }

    try {
        if (!databaseConnection) {
            const client = new MongoClient(process.env.MONGODB_URL);
            databaseConnection = client.connect()
                .then(() => {
                    const db = client.db("wanderlust");
                    destinationsCollection = db.collection("destinations");
                    bookingsCollection = db.collection("bookings");
                })
                .catch((error) => {
                    databaseConnection = undefined;
                    throw error;
                });
        }

        await databaseConnection;
        return next();
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        return res.status(503).json({ message: 'Database is temporarily unavailable.' });
    }
};

app.use(ensureDatabaseConnection);


const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access. Please login.' });
    };

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).send({ msg: 'Unauthorized !' })
    }
    const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`));

    try {
        const { payload } = await jwtVerify(token, JWKS)
        console.log('Token payload:', payload);
        next();
    } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(401).send({ message: 'Unauthorized access. Invalid token.' });
    }
};


app.post('/add_destination',verifyToken ,async (req, res) => {

    const data = req.body;

    const result = await destinationsCollection.insertOne(data);
    // console.log(result);
    res.send(result);

});

// সব ডেস্টিনেশন (লিস্ট) - এখানে অথেনটিকেশন চেক যোগ করা হয়েছে
app.get('/destinations', verifyToken, async (req, res) => {


    try {
        const result = await destinationsCollection.find({}).toArray();
        return res.send(result);
    } catch (error) {
        console.error('Failed to load destinations:', error);
        return res.status(500).json({ message: 'Could not load destinations.' });
    }
});


// Bookings API
app.post('/bookings', verifyToken, async (req, res) => {
    const data = req.body;

    const result = await bookingsCollection.insertOne(data);
    // console.log(result);
    res.send(result);
});

app.get('/bookings/:email', verifyToken, async (req, res) => {
    const { email } = req.params;
    const result = await bookingsCollection.find({ email: email }).toArray();
    res.send(result);
});

app.delete('/bookings/:id', verifyToken, async (req, res) => {

    const { id } = req.params;
    const email = req.get('x-user-email');

    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid booking ID.' });
    }

    if (!email) {
        return res.status(401).json({ message: 'Authentication is required to cancel a booking.' });
    }

    try {
        const result = await bookingsCollection.deleteOne({
            _id: new ObjectId(id),
            email,
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Booking not found.' });
        }

        return res.json({ message: 'Booking cancelled successfully.' });
    } catch (error) {
        console.error('Failed to cancel booking:', error);
        return res.status(500).json({ message: 'Could not cancel booking.' });
    }
});

app.get('/destinations/:id', verifyToken, async (req, res) => {

    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid destination ID.' });
    }

    try {
        const result = await destinationsCollection.findOne({ _id: new ObjectId(id) });

        if (!result) {
            return res.status(404).json({ message: 'Destination not found.' });
        }

        return res.json(result);
    } catch (error) {
        console.error('Failed to load destination:', error);
        return res.status(500).json({ message: 'Could not load destination.' });
    }
});

app.put('/destinations/:id',verifyToken ,async (req, res) => {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid destination ID.' });
    }

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({ message: 'A destination object is required.' });
    }

    const requiredFields = ['name', 'country', 'category', 'price', 'duration'];
    for (const field of requiredFields) {
        if (body[field] === undefined || String(body[field]).trim() === '') {
            return res.status(400).json({ message: `${field} is required.` });
        }
    }

    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ message: 'Price must be a non-negative number.' });
    }

    const rating = Number(body.rating ?? 0);
    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 0 and 5.' });
    }

    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
    if (imageUrl && !/^https?:\/\/\S+$/i.test(imageUrl)) {
        return res.status(400).json({ message: 'Image URL must be a valid HTTP or HTTPS URL.' });
    }

    const updatedDestination = {
        name: String(body.name).trim(),
        country: String(body.country).trim(),
        category: String(body.category).trim(),
        price,
        duration: String(body.duration).trim(),
        rating,
        departureDate: typeof body.departureDate === 'string' ? body.departureDate : '',
        image: imageUrl,
        imageUrl,
        description: typeof body.description === 'string' ? body.description.trim() : '',
    };

    try {
        const result = await destinationsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedDestination }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Destination not found.' });
        }

        return res.json({ message: 'Destination updated successfully.' });
    } catch (error) {
        console.error('Failed to update destination:', error);
        return res.status(500).json({ message: 'Could not update destination.' });
    }
});

app.delete('/destinations/:id',verifyToken, async (req, res) => {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid destination ID.' });
    }

    try {
        const result = await destinationsCollection.deleteOne({
            _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Destination not found.' });
        }

        return res.json({ message: 'Destination deleted successfully.' });
    } catch (error) {
        console.error('Failed to delete destination:', error);
        return res.status(500).json({ message: 'Could not delete destination.' });
    }
});

export default app;