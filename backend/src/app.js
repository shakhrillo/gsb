require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/file');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const restaurantsRoutes = require('./routes/restaurants');
const swaggerSpec = require('./swagger/swaggerSpec');

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
app.use('/api/auth', authRoutes);
app.use('/api/file', fileRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/track', orderRoutes);
app.use('/api/restaurants', restaurantsRoutes);
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
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});