const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const cookieParser = require("cookie-parser");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const axios = require("axios");
var qr = require("qr-image");

const app = express();
const PORT = 3001;
const JWT_SECRET =
  "8e3dbaafa6aeb3dd4bc4ed5fe6af6608267793799f171fada5b7a56ff44d3aa6";

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "Reg_Log",
  password: "Sabaka11",
  port: 5432,
});

const uri = "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);
let db;

async function connectDB() {
  try {
    await client.connect();
    console.log("Подключено к MongoDB");
    db = client.db("blods");
    app.locals.db = db; // Добавлено, чтобы Jest мог получить db
  } catch (error) {
    console.error("Ошибка подключения к MongoDB:", error);
  }
}
connectDB();

//nodemailer
const transporter = nodemailer.createTransport({
  host: "smtp.mail.ru",
  auth: {
    user: "beysembay.a.1@mail.ru",
    pass: "JN5vij9Lj9hHjU0wx6gF", // пароль приложения
  },
});

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.resolve(__dirname, "public")));

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "main.html"));
});
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});
app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "register.html"));
});
app.get("/main", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "main2.html"));
});
// Регистрация
app.post("/register", async (req, res) => {
  const { username, mail, password, password2 } = req.body;

  if (!username || !mail || !password || !password2 || password !== password2) {
    return res.send(
      `<script>alert("Ошибка! Проверьте введенные данные."); window.location="/register";</script>`
    );
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3)",
      [username, mail, hashedPassword]
    );

    // Отправка email
    const mailOptions = {
      from: "beysembay.a.1@mail.ru",
      to: mail,
      subject: "Registration",
      text: `Hello, ${username}! Thanks for registration. Welcome to my final project.`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    });

    res.send(
      `<script>alert("Registration successful! Check your email."); window.location="/login";</script>`
    );
  } catch (error) {
    console.error(error);
    res.send(
      `<script>alert("Server error! Try again."); window.location="/register";</script>`
    );
  }
});
// Логин
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .send(
        `<script>alert("Ошибка! Заполните все поля."); window.location="/login";</script>`
      );
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    if (result.rows.length === 0) {
      return res
        .status(400)
        .send(
          `<script>alert("Ошибка! Пользователь не найден."); window.location="/login";</script>`
        );
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res
        .status(400)
        .send(
          `<script>alert("Ошибка! Неверный пароль."); window.location="/login";</script>`
        );
    }

    // Генерация JWT токена
    const token = jwt.sign({ username: user.username }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.cookie("token", token, { httpOnly: true, maxAge: 3600000 });
    res.redirect("/main");
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send(
        `<script>alert("Ошибка сервера! Попробуйте снова."); window.location="/login";</script>`
      );
  }
});
// Middleware для проверки токена
function authenticateToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return next(); // Нет токена, пропускаем без авторизации
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error("Ошибка проверки токена:", err);
      res.clearCookie("token"); // Удаляем недействительный токен
      return next();
    }
    req.user = user; // Добавляем данные пользователя в запрос
    next();
  });
}
// Применяем middleware
app.get("/main", authenticateToken, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "main.html"));
});

// QR img
app.post("/generate-qr", (req, res) => {
  const url = req.body.url; // Получаем URL из формы
  const qrCode = qr.imageSync(url, { type: "png" }); // Генерация QR-кода

  // Отправка изображения QR-кода
  res.type("png");
  res.send(qrCode);
});

// Отправка HTML-страницы с формой
app.get("/qr-image", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "qr-image.html"));
});

//BMI
app.get("/BMI", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "BMI.html"))
);
app.post("/calculate-bmi", (req, res) => {
  const { weight, height } = req.body;
  const weightNum = parseFloat(weight);
  const heightNum = parseFloat(height);

  if (!weightNum || !heightNum || weightNum <= 0 || heightNum <= 0) {
    return res.json({ error: "Weight and height must be positive numbers" });
  }

  const bmi = weightNum / (heightNum * heightNum);
  let category = "";

  if (bmi < 18.5) category = "Underweight";
  else if (bmi >= 18.5 && bmi < 24.9) category = "Normal weight";
  else if (bmi >= 25 && bmi < 29.9) category = "Overweight";
  else category = "Obese";

  res.json({ bmi: bmi.toFixed(2), category });
});

//API
app.get("/API", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "API.html"))
);
const getWeather = async (city) => {
  const apiKey = "7639ee896623e646c38a76973cfaa9c9"; // Ваш ключ для качества воздуха
  const url = `http://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
    city
  )}&appid=${apiKey}&units=metric`;

  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Ошибка при получении данных о погоде:", error);
    return null;
  }
};
const getNews = async (city) => {
  const apiKey = "72a10662d48d48cb8baa51250ee2decc";
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
    city
  )}&apiKey=${apiKey}`;

  try {
    const response = await axios.get(url);
    return response.data.articles;
  } catch (error) {
    console.error("Ошибка при получении новостей:", error);
    return [];
  }
};
const getTimeZone = async (lat, lon) => {
  const apiKey = "Q7DPAOH6TZXU"; // Ваш ключ для TimeZone API
  const url = `https://api.timezonedb.com/v2.1/get-time-zone?key=${apiKey}&format=json&by=position&lat=${lat}&lng=${lon}`;

  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Ошибка при получении данных о времени:", error);
    return null;
  }
};
app.get("/weather", async (req, res) => {
  const city = req.query.city;
  const weatherData = await getWeather(city);

  if (weatherData) {
    const { name, main, weather, wind, coord, sys, rain } = weatherData;
    const { lat, lon } = coord;
    const temperature = main.temp;
    const feelsLike = main.feels_like;
    const humidity = main.humidity;
    const pressure = main.pressure;
    const windSpeed = wind.speed;
    const description = weather[0].description;
    const iconUrl = `http://openweathermap.org/img/wn/${weather[0].icon}.png`;
    const country = sys.country;

    const newsData = (await getNews(city)).slice(0, 5); // Ограничиваем до 5 новостей

    const timeZoneData = await getTimeZone(lat, lon);

    const rainVolume = weatherData.rain ? weatherData.rain["1h"] : 0;
    const snowVolume = weatherData.snow ? weatherData.snow["1h"] : 0;

    const totalPrecipitation = rainVolume + snowVolume;

    res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weather in ${city}</title>
    <script async src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCjAn1THIVWMppu3tThvDnRb-yemfxarWY&callback=initMap&libraries=maps,marker&v=beta">
    </script>
    <style>
        /* Global Styles */
        body {
            padding: 50px 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
            margin: 0;
            color: #333;
        }
        h1, h3 {
            color: #333;
            margin-bottom: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            background-color: #fff;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        .form-container {
            margin-bottom: 30px;
        }
        input[type="text"] {
            padding: 12px;
            font-size: 18px;
            width: 60%;
            margin-right: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            transition: all 0.3s ease;
        }
        input[type="text"]:focus {
            border-color: #1e90ff;
            outline: none;
        }
        button {
            padding: 12px 24px;
            font-size: 18px;
            background-color: #1e90ff;
            color: #fff;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: background-color 0.3s ease;
        }
        button:hover {
            background-color: #4682b4;
        }
        button:focus {
            outline: none;
        }
        /* Weather Card Styles */
        .weather-card {
            display: flex;
            justify-content: center;
            padding: 20px;
            margin-top: 30px;
            border: 1px solid #ddd;
            border-radius: 12px;
            background-color: #f8f8f8;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            text-align: left;
            width: 95%;
        }

        .weather-card table {
            padding: 20px 0px;
            width: 100%;
            border-collapse: collapse;
        }

        .weather-card td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
        }

        .weather-card td strong {
            color: #1e90ff;
        }

        .weather-card .weather-icon {
            width: 80px;
            height: 80px;
            margin-right: 20px;
        }

        .weather-card h3 {
            font-size: 28px;
            color: #333;
            margin: 0;
        }

        /* Map Styling */
        #map {
            height: 450px;
            width: 100%;
            border-radius: 12px;
            margin-top: 30px;
        }
        /* Error Message */
        .error-message {
            color: red;
            font-size: 20px;
            margin-top: 20px;
            text-align: center;
        }
        #map {
            height: 100vh;
            width: 100%;
        }
        /* Responsive Adjustments */
        @media (max-width: 768px) {
            .container {
                padding: 20px;
            }
            input[type="text"] {
                width: 80%;
            }
            button {
                padding: 10px 20px;
            }
            .weather-card h3 {
                font-size: 24px;
            }
        }

        #back{
        position: relative;
        right: 40%;
        color: #333;
        text-decoration: none;
        font-size: 20px;
        font-weight: bold;
        }
        
    </style>
    <script>
        function initMap() {
    const cityCoordinates = { lat: parseFloat(${lat}), lng: parseFloat(${lon}) };
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 10,
        center: cityCoordinates,
    });
    new google.maps.Marker({
        position: cityCoordinates,
        map: map,
        title: "${name}"
    });
}

    </script>
</head>
<body>
    <div class="container">
        <a id="back" href="/API.html">⬅ Go back</a>
        <h1>Weather in ${name}, ${country}</h1>
        <div class="weather-card">
        <table>
        <tr>
            <td><img src="${iconUrl}" alt="${description}" class="weather-icon"></td>
            <td colspan="2"><h3>${temperature}°C</h3></td>
        </tr>
        <tr>
            <td><strong>Description:</strong></td>
            <td colspan="2">${description}</td>
        </tr>
        <tr>
            <td><strong>Feels like:</strong></td>
            <td>${feelsLike}°C</td>
        </tr>
        <tr>
            <td><strong>Humidity:</strong></td>
            <td>${humidity}%</td>
        </tr>
        <tr>
            <td><strong>Pressure:</strong></td>
            <td>${pressure} hPa</td>
        </tr>
        <tr>
            <td><strong>Wind speed:</strong></td>
            <td>${windSpeed} m/s</td>
        </tr>
        <tr>
            <td><strong>Total precipitation (last 3h):</strong></td>
            <td>${totalPrecipitation} mm</td>
        </tr>
        </table>
    </div>


        <h3>Current Time</h3>
        <div class="weather-card">
            <p>Time: ${timeZoneData.formatted}</p>
        </div>

        <div class="news">
            <h2>Новости</h2>
            ${newsData
              .map(
                (article) => `
              <div class="news-item">
                <a href="${article.url}" target="_blank"><strong>${article.title}</strong></a>
                <p>${article.description}</p>
              </div>
            `
              )
              .join("")}
          </div>

        <h1>Google Maps API</h1>
        <div id="map"></div>
    </div>
</body>
</html>
`);
  } else {
    res.send(`
      <h1>Error fetching weather data for ${city}</h1>
      <a href="/API.html">Go back</a>
    `);
  }
});

// CRUD
app.get("/CRUD", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "CRUD.html"))
);
app.post("/blogs", async (req, res) => {
  const db = req.app.locals.db; // Берем db из app.locals
  const { title, body, author } = req.body;
  if (!title || !body)
    return res.status(400).json({ error: "Title and body are required" });

  const newBlog = {
    title,
    body,
    author: author || "Anonymous",
    createdAt: new Date(),
  };
  const result = await db.collection("blogs").insertOne(newBlog);
  res.status(201).json({ message: "Blog created", postId: result.insertedId });
});
app.get("/blogs", async (req, res) => {
  const db = req.app.locals.db;
  const blogs = await db.collection("blogs").find().toArray();
  res.status(200).json(blogs);
});
app.get("/blogs/:id", async (req, res) => {
  const db = req.app.locals.db;
  const blog = await db
    .collection("blogs")
    .findOne({ _id: new ObjectId(req.params.id) });
  if (!blog) return res.status(404).json({ error: "Blog not found" });
  res.status(200).json(blog);
});
app.put("/blogs/:id", async (req, res) => {
  const db = req.app.locals.db;
  const { title, body, author } = req.body;
  const updateData = {};
  if (title) updateData.title = title;
  if (body) updateData.body = body;
  if (author) updateData.author = author;

  const result = await db
    .collection("blogs")
    .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

  if (result.matchedCount === 0)
    return res.status(404).json({ error: "Blog not found" });
  res.status(200).json({ message: "Blog updated" });
});
app.delete("/blogs/:id", async (req, res) => {
  const db = req.app.locals.db;
  const result = await db
    .collection("blogs")
    .deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0)
    return res.status(404).json({ error: "Blog not found" });
  res.status(200).json({ message: "Blog deleted" });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
