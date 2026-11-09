# Wanderlust Server

Wanderlust is an Express.js API backend that stores destination and booking data in MongoDB. It is configured to run as a Vercel serverless function.

## Requirements

- Node.js compatible with the dependencies in `package.json`
- A MongoDB database
- A frontend authentication service that exposes a JWKS endpoint at `/api/auth/jwks`

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root:

   ```env
   MONGODB_URL=mongodb+srv://<username>:<password>@<cluster>/<database>
   CLIENT_URL=http://localhost:3000
   ```

   Replace the example values with your own. `CLIENT_URL` is the frontend origin, without a trailing slash. The server verifies JWTs using `${CLIENT_URL}/api/auth/jwks`.

3. Start the local Vercel development environment:

   ```bash
   npx vercel dev
   ```

## Deploy to Vercel

1. Set this server directory as the Vercel project's **Root Directory**.
2. Add `MONGODB_URL` and `CLIENT_URL` under the Vercel project's **Environment Variables** for each environment you use (Production, Preview, and/or Development).
   - `MONGODB_URL` must be a valid MongoDB connection string.
   - `CLIENT_URL` must be the deployed frontend's origin, without a trailing slash, and must serve `/api/auth/jwks`.
3. If you use MongoDB Atlas, configure its network access so the Vercel function can connect.
4. Deploy with the Vercel CLI:

   ```bash
   npx vercel
   ```

   To deploy to production:

   ```bash
   npx vercel --prod
   ```

The `vercel.json` configuration routes requests to `index.js`. The Express application is exported for serverless use; it does not call `app.listen()`. Do not commit `.env` or put secrets in this README.

## API

All protected endpoints require a valid JWT in the `Authorization` header:

```http
Authorization: Bearer <JWT>
```

The token is verified against the JWKS endpoint at `${CLIENT_URL}/api/auth/jwks`.

| Method | Endpoint | Description | Authentication |
| --- | --- | --- | --- |
| `GET` | `/` | Server health response | Not required |
| `POST` | `/add_destination` | Create a destination | Required |
| `GET` | `/destinations` | List all destinations | Required |
| `GET` | `/destinations/:id` | Get a destination by ID | Required |
| `PUT` | `/destinations/:id` | Update a destination | Required |
| `DELETE` | `/destinations/:id` | Delete a destination | Required |
| `POST` | `/bookings` | Create a booking | Required |
| `GET` | `/bookings/:email` | List bookings for an email address | Required |
| `DELETE` | `/bookings/:id` | Cancel a booking | Required |

For requests with a JSON body, send `Content-Type: application/json`. Updating a destination requires `name`, `country`, `category`, `price`, and `duration`. Cancelling a booking also requires the `x-user-email` header; the booking is deleted only when its stored email matches that value.

## Database

The API uses the `wanderlust` database with these collections:

- `destinations`
- `bookings`
