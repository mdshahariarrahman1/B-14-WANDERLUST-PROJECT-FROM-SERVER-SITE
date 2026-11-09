# Wanderlust Server

Wanderlust-এর Express.js API backend। এটি MongoDB-তে destination ও booking-এর তথ্য সংরক্ষণ করে এবং Vercel serverless function হিসেবে deploy করা যায়।

## প্রয়োজনীয়তা

- Node.js 18 বা পরবর্তী সংস্করণ
- MongoDB database
- Frontend থেকে JWT যাচাইয়ের জন্য JWKS endpoint

## Local development

1. Dependencies install করুন:

   ```bash
   npm install
   ```

2. Project root-এ `.env` ফাইল তৈরি করে environment variables দিন:

   ```env
   MONGODB_URL=mongodb+srv://<username>:<password>@<cluster>/<database>
   CLIENT_URL=https://your-frontend-domain.example
   ```

   `CLIENT_URL`-এ শেষে `/` দেবেন না। এই server `${CLIENT_URL}/api/auth/jwks` থেকে JWT public keys নেয়।

3. Vercel CLI দিয়ে development server চালান:

   ```bash
   npx vercel dev
   ```

## Deploy to Vercel

1. এই server folder-টিকে Vercel project-এর **Root Directory** হিসেবে নির্বাচন করুন।
2. Vercel project settings-এর **Environment Variables**-এ `MONGODB_URL` ও `CLIENT_URL` যোগ করুন। যে environment-এ deploy করবেন (Production, Preview বা Development), সেটিতে variables-গুলো উপলভ্য আছে নিশ্চিত করুন।
3. MongoDB Atlas ব্যবহার করলে database network access-এ Vercel function থেকে সংযোগ অনুমোদিত রাখুন।
4. Vercel CLI দিয়ে deploy করুন:

   ```bash
   npx vercel
   ```

   Production deploy-এর জন্য:

   ```bash
   npx vercel --prod
   ```

`vercel.json` সব request-কে `index.js` serverless function-এ route করে। Express app default export করা আছে; আলাদা `app.listen()` প্রয়োজন নেই। `.env`-এর secret মানগুলো Git-এ commit করবেন না।

## API

সব protected endpoint-এ `Authorization: Bearer <JWT>` header পাঠাতে হবে। JWT-টি `CLIENT_URL`-এর JWKS endpoint দিয়ে যাচাই করা হয়।

| Method | Endpoint | বিবরণ | Authentication |
| --- | --- | --- | --- |
| `GET` | `/` | Server health response | প্রয়োজন নেই |
| `POST` | `/add_destination` | Destination যোগ করে | প্রয়োজন |
| `GET` | `/destinations` | সব destination দেখায় | প্রয়োজন |
| `GET` | `/destinations/:id` | ID দিয়ে destination দেখায় | প্রয়োজন |
| `PUT` | `/destinations/:id` | Destination update করে | প্রয়োজন |
| `DELETE` | `/destinations/:id` | Destination মুছে দেয় | প্রয়োজন |
| `POST` | `/bookings` | Booking তৈরি করে | প্রয়োজন |
| `GET` | `/bookings/:email` | Email অনুযায়ী booking দেখায় | প্রয়োজন |
| `DELETE` | `/bookings/:id` | নিজের booking বাতিল করে | প্রয়োজন |

JSON body-যুক্ত request-এ `Content-Type: application/json` পাঠান। Destination update-এর জন্য `name`, `country`, `category`, `price`, ও `duration` প্রয়োজন। Booking বাতিলের request-এ JWT-এর পাশাপাশি `x-user-email` header দিতে হবে; শুধু ওই email-এর booking-ই মুছবে।

## Database

API `wanderlust` database-এ নিচের collection ব্যবহার করে:

- `destinations`
- `bookings`
