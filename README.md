# Final project

## Description
This project is an Express-based Node.js server that provides user authentication, registration, and additional API services such as QR code generation, BMI calculation, and weather/news fetching. The project uses PostgreSQL for storing user data and MongoDB for other functionalities.

## Features
- User registration and login with password hashing (bcrypt) and JWT authentication.
- Email verification using Nodemailer.
- QR code generation for URLs.
- BMI calculation.
- Weather, news, and time zone data retrieval using external APIs.
- Express middleware for authentication and handling cookies.

## Technologies Used
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL, MongoDB
- **Authentication**: JWT, bcrypt
- **APIs**: OpenWeather API, News API, TimeZoneDB
- **Email Service**: Nodemailer
- **Other Libraries**: cookie-parser, cors, axios, qr-image

## Installation
### Prerequisites
Make sure you have the following installed on your machine:
- Node.js
- PostgreSQL
- MongoDB

### Steps
1. Clone the repository:
   ```sh
   git clone https://github.com/your-repository.git
   cd your-repository
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Configure PostgreSQL:
   - Create a database named `Reg_Log`.
   - Update the connection details in the `pool` configuration in `server.js`.
4. Configure MongoDB:
   - Ensure MongoDB is running locally at `mongodb://127.0.0.1:27017`.
   - The database name is `blods`.
5. Create a `.env` file and add your credentials (optional for security):
   ```env
   JWT_SECRET=your_jwt_secret
   MAIL_USER=your_email@mail.com
   MAIL_PASS=your_email_password
   WEATHER_API_KEY=your_weather_api_key
   NEWS_API_KEY=your_news_api_key
   TIMEZONE_API_KEY=your_timezone_api_key
   ```
6. Start the server:
   ```sh
   node server.js
   ```

## API Endpoints
### Authentication
- `POST /register` - User registration.
- `POST /login` - User login.

### QR Code
- `POST /generate-qr` - Generates a QR code from a URL.

### BMI Calculation
- `POST /calculate-bmi` - Calculates BMI from user input.

### Weather & News
- `GET /weather?city={city}` - Fetches weather and news information for a given city.

## Usage
- Open `http://localhost:3001` in your browser.
- Register or log in to access the main page.
- Use API endpoints for various services.

## License
This project is open-source and available under the MIT License.

