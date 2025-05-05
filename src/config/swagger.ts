import swaggerJSDoc from 'swagger-jsdoc';
import { version } from '../../package.json';
import path from 'path';

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Enligne API',
    version,
    description: 'API documentation for the Enligne multi-vendor delivery platform',
    license: {
      name: 'ISC',
      url: 'https://opensource.org/licenses/ISC',
    },
    contact: {
      name: 'Enligne Support',
      url: 'https://enligne.example.com',
      email: 'support@enligne.example.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Development server',
    },
    {
      url: 'https://enligne-backend.vercel.app/api/v1',
      description: 'Production server',
    },
  ],
  tags: [
    {
      name: 'Auth',
      description: 'Authentication endpoints',
    },
    {
      name: 'Users',
      description: 'User management endpoints',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        required: ['email', 'fullName', 'phone'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'User ID',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email',
          },
          fullName: {
            type: 'string',
            description: 'User full name',
          },
          address: {
            type: 'string',
            description: 'User address',
          },
          phone: {
            type: 'string',
            description: 'User phone number',
          },
          role: {
            type: 'string',
            enum: ['CUSTOMER', 'MERCHANT', 'RIDER', 'ADMIN'],
            description: 'User role',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp',
          },
        },
      },
      Address: {
        type: 'object',
        required: ['street', 'city', 'state', 'country', 'postalCode'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Address ID',
          },
          street: {
            type: 'string',
            description: 'Street address',
          },
          city: {
            type: 'string',
            description: 'City',
          },
          state: {
            type: 'string',
            description: 'State or province',
          },
          country: {
            type: 'string',
            description: 'Country',
          },
          postalCode: {
            type: 'string',
            description: 'Postal code',
          },
          isDefault: {
            type: 'boolean',
            description: 'Whether this is the default address',
          },
          userId: {
            type: 'string',
            format: 'uuid',
            description: 'ID of the user who owns this address',
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            example: 'error',
          },
          statusCode: {
            type: 'integer',
            example: 400,
          },
          message: {
            type: 'string',
            example: 'Invalid input data',
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  example: 'email',
                },
                message: {
                  type: 'string',
                  example: 'Invalid email format',
                },
              },
            },
          },
        },
      },
    },
  },
};

// Options for the swagger docs
const options = {
  swaggerDefinition,
  apis: [
    path.join(__dirname, '../routes/*.ts'),
    path.join(__dirname, '../routes/*.js'),
  ],
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec; 