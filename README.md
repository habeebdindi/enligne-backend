# Enligne - Multi-vendor Delivery Platform Backend

A comprehensive backend system for a multi-vendor delivery platform where customers can order anything (food, groceries, retail items, etc.) from merchants onboarded to the platform, similar to Chowdeck in Nigeria.

## Architecture Overview

The backend follows a Clean Architecture approach with clear separation of concerns:

- **Domain Layer**: Contains business entities and interfaces
- **Application Layer**: Contains use cases and services
- **Infrastructure Layer**: Database, external services, file storage
- **Presentation Layer**: REST API controllers

## Tech Stack

- **Language**: TypeScript
- **Framework**: Node.js with Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Validation**: Zod
- **Logging**: Morgan
- **Security**: Helmet, CORS, Rate Limiting
- **Documentation**: Swagger/OpenAPI

## API Documentation

The API is documented using Swagger/OpenAPI Specification. When the server is running, you can access the interactive API documentation at:

```
http://localhost:3000/api-docs
```

The documentation includes:

- Detailed information about all endpoints
- Request and response schemas
- Authentication requirements
- Example requests
- Interactive API testing capability

You can also access the raw Swagger JSON at:

```
http://localhost:3000/swagger.json
```

## Database Schema

The database is designed around the following core entities:

- **User**: Base entity for all users (customers, merchants, riders, admins)
- **Customer**: Profile for users with the CUSTOMER role
- **Merchant**: Profile for users with the MERCHANT role
- **Rider**: Profile for users with the RIDER role
- **Product**: Items sold by merchants
- **Cart**: Shopping cart for customers
- **Order**: Customer orders from merchants
- **Delivery**: Delivery information for orders
- **Payment**: Payment information for orders
- **Address**: Delivery addresses for users
- **Review**: Customer reviews for merchants
- **Notification**: System notifications for users

## API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login user and get tokens
- `POST /api/v1/auth/refresh-token` - Refresh access token

### User Management

- `GET /api/v1/users/me` - Get current user profile
- `PUT /api/v1/users/me` - Update user profile
- `POST /api/v1/users/change-password` - Change user password
- `GET /api/v1/users/addresses` - Get user addresses
- `POST /api/v1/users/addresses` - Create a new address
- `PUT /api/v1/users/addresses/:id` - Update an address
- `DELETE /api/v1/users/addresses/:id` - Delete an address

### Merchant Management

- `GET /api/v1/merchants` - Get all merchants
- `GET /api/v1/merchants/:id` - Get merchant details
- `POST /api/v1/merchants` - Create a merchant profile (for users with MERCHANT role)
- `PUT /api/v1/merchants/:id` - Update merchant profile
- `GET /api/v1/merchants/:id/products` - Get merchant products

### Product Management

- `GET /api/v1/products` - Get all products
- `GET /api/v1/products/:id` - Get product details
- `POST /api/v1/products` - Create a new product (for merchants)
- `PUT /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Delete product

### Order Management

- `GET /api/v1/orders` - Get user orders
- `GET /api/v1/orders/:id` - Get order details
- `POST /api/v1/orders` - Create a new order
- `PUT /api/v1/orders/:id/status` - Update order status
- `GET /api/v1/orders/:id/tracking` - Track order delivery

### Delivery Management

- `GET /api/v1/deliveries/rider` - Get rider deliveries
- `PUT /api/v1/deliveries/:id/status` - Update delivery status
- `PUT /api/v1/deliveries/:id/location` - Update delivery location

### Payment Management

- `POST /api/v1/payments` - Process payment
- `GET /api/v1/payments/methods` - Get payment methods
- `GET /api/v1/payments/:id/status` - Check payment status

## Setup and Installation

### Prerequisites

- Node.js (v14 or later)
- PostgreSQL (v12 or later)
- Redis (optional, for caching)

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/enligne-backend.git
   cd enligne-backend
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   ```
   cp .env.example .env
   ```
   Edit `.env` with your configuration

4. Set up the database
   ```
   npx prisma migrate dev
   ```

5. Start the development server
   ```
   npm run dev
   ```

### Running in Production

1. Build the application
   ```
   npm run build
   ```

2. Start the production server
   ```
   npm start
   ```

## Security Considerations

- All passwords are hashed using bcrypt
- JWTs are used for authentication with short expiry times
- Refresh tokens are implemented for improved security
- Rate limiting is applied to prevent abuse
- Input validation is performed on all endpoints
- CORS is configured to restrict access
- Helmet is used to set security headers

## Performance Considerations

- Database indexes are defined for frequently queried fields
- Query optimization is applied for complex queries
- Connection pooling is used for database connections
- Pagination is implemented for list endpoints

## Future Improvements

- Implement WebSocket for real-time order tracking
- Add caching layer with Redis
- Implement message queue for background processing
- Set up CI/CD pipelines
- Add comprehensive test suite
- Implement advanced analytics
- Add support for multiple languages

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License. 