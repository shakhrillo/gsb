console.log("start")
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const authRoutes = require('./routes/auth');
const merchantsRoutes = require('./routes/merchants');
const citiesRoutes = require('./routes/cities');
const paymentsRoutes = require('./routes/payments');
const fileRoutes = require('./routes/file');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const restaurantsRoutes = require('./routes/restaurants');
const categoriesRoutes = require('./routes/categories');
const swaggerSpec = require('./swagger/swaggerSpec');
const errorMiddleware = require('./middleware/error.middleware');
const clickRoutes = require('./routes/click');
const notificationRoutes = require('./routes/notifications');
const termsRoutes = require('./routes/terms');
const privacyRoutes = require('./routes/privacy');
const receiptChecker = require('./middleware/receiptChecker');

const telegramBotInit = require('./services/telegram').telegramBotInit;
telegramBotInit();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Swagger documentation route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check route
app.get('/', (req, res) => {
  res.status(200).send('API is running');
});

// API routes
app.use('/auth', authRoutes);
app.use('/categories', categoriesRoutes);
app.use('/merchants', merchantsRoutes);
app.use('/cities', citiesRoutes);
app.use('/payments', paymentsRoutes);
app.use('/click', clickRoutes);
app.use('/file', fileRoutes);
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/track', orderRoutes);
app.use('/restaurants', restaurantsRoutes);
app.use('/notifications', notificationRoutes);
app.use('/terms', termsRoutes);
app.use('/privacy', privacyRoutes);

app.use(errorMiddleware)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Something went wrong!' });
});

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1); // Exit process to avoid undefined behavior
});

// Start the server
const PORT = process.env.PORT;
console.log('here')
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});