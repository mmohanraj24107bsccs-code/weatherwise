# Weatherwise

AI-Powered Weather Forecasts and Personalized Insights.

Weatherwise combines real-time environmental data with Google Gemini AI to turn raw
forecasts into clear summaries and practical recommendations for travelers and everyday
users. Users can save favorite cities, retrieve current conditions, and request
personalized advice for outdoor activities, clothing, travel planning, and changing
weather.

## Tech stack

Node.js, Express.js, MongoDB, Mongoose, HTML/CSS, OpenWeatherMap API, Google Gemini AI,
JWT, bcrypt.js, REST API.

## Key engineering features

- **JWT authentication** with bcrypt password hashing (10 salt rounds)
- **Request sanitization** (`express-mongo-sanitize`) to block NoSQL injection
- **Rate limiting** on all `/api` routes
- **Centralized error handling** with consistent JSON error shapes
- **Resilient fallback mode**: if `MONGO_URI`, `OPENWEATHER_API_KEY`, or `GEMINI_API_KEY`
  are missing or a live call fails, the API transparently falls back to realistic mock
  weather/insight data (and an in-memory user store) so the product never hard-fails in a
  demo or during a provider outage. Check `GET /api/health` to see which mode is active.

## Project structure

```
weatherwise/
├── backend/
│   ├── config/db.js              # Mongo connection (non-fatal on failure)
│   ├── controllers/
│   │   ├── authController.js     # register / login / me
│   │   ├── weatherController.js  # OpenWeatherMap + favorites CRUD
│   │   └── aiController.js       # Gemini-powered insights
│   ├── middleware/
│   │   ├── auth.js               # JWT verification
│   │   └── errorHandler.js       # centralized error responses
│   ├── models/User.js            # user + favoriteCities schema
│   ├── routes/                   # authRoutes, weatherRoutes, aiRoutes
│   ├── utils/fallbackData.js     # deterministic mock data generator
│   ├── server.js                 # app entrypoint
│   ├── package.json
│   └── .env.example
└── frontend/
    └── index.html                # lightweight static client (fetch-based)
```

## Getting started

```bash
cd backend
cp .env.example .env      # fill in MONGO_URI / OPENWEATHER_API_KEY / GEMINI_API_KEY
npm install
npm run dev                # nodemon, or `npm start` for plain node
```

The API boots even with an empty `.env` — it will log that it's running in fallback mode.

Open `frontend/index.html` in a browser (or serve it with any static server) and point it
at your API base URL (defaults to `http://localhost:5000/api`).

## API reference

| Method | Endpoint                      | Auth | Description                                  |
|--------|--------------------------------|------|-----------------------------------------------|
| GET    | `/api/health`                  | No   | Service status + active mode (live/fallback) |
| POST   | `/api/auth/register`           | No   | `{ name, email, password }`                  |
| POST   | `/api/auth/login`              | No   | `{ email, password }` → returns JWT          |
| GET    | `/api/auth/me`                 | Yes  | Current user profile                          |
| GET    | `/api/weather/current?city=`   | No   | Current conditions for a city                |
| GET    | `/api/weather/favorites`       | Yes  | Weather for all saved cities                  |
| POST   | `/api/weather/favorites`       | Yes  | Save a city (`{ name, country, lat, lon }`)   |
| DELETE | `/api/weather/favorites/:id`   | Yes  | Remove a saved city                           |
| GET    | `/api/ai/insight?city=&activity=` | No | Gemini-generated summary + recommendations |

Send the JWT as `Authorization: Bearer <token>` on protected routes.

## Business model (per the product brief)

- **Freemium**: current conditions + up to 3 saved cities, free.
- **Premium**: unlimited cities, advanced AI recommendations, severe-weather alerts,
  travel planning, historical insights.
- **B2B / white-label**: REST API for travel, logistics, events, and outdoor-recreation
  platforms.

The free-tier cap (3 cities) is enforced server-side in `weatherController.addFavorite`.
