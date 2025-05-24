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
      url: 'http://localhost:5000/api/v1',
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
    {
      name: 'Home',
      description: 'Home page and general browsing endpoints',
    },
    {
      name: 'Merchants',
      description: 'Merchant management endpoints',
    },
    {
      name: 'Orders',
      description: 'Order management endpoints',
    },
    {
      name: 'Products',
      description: 'Product management endpoints',
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
          isVerified: {
            type: 'boolean',
            description: 'Whether the user is verified',
          },
          isActive: {
            type: 'boolean',
            description: 'Whether the user account is active',
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
      Merchant: {
        type: 'object',
        required: ['businessName', 'address', 'businessPhone'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Merchant ID',
          },
          businessName: {
            type: 'string',
            description: 'Business name',
          },
          description: {
            type: 'string',
            description: 'Business description',
          },
          logo: {
            type: 'string',
            description: 'Logo URL',
          },
          coverImage: {
            type: 'string',
            description: 'Cover image URL',
          },
          address: {
            type: 'string',
            description: 'Business address',
          },
          location: {
            type: 'object',
            properties: {
              lat: {
                type: 'number',
                description: 'Latitude',
              },
              lng: {
                type: 'number',
                description: 'Longitude',
              },
            },
          },
          businessPhone: {
            type: 'string',
            description: 'Business phone number',
          },
          businessEmail: {
            type: 'string',
            format: 'email',
            description: 'Business email',
          },
          openingHours: {
            type: 'object',
            description: 'Business opening hours',
          },
          rating: {
            type: 'number',
            description: 'Average rating',
          },
          isActive: {
            type: 'boolean',
            description: 'Whether the merchant is active',
          },
          isVerified: {
            type: 'boolean',
            description: 'Whether the merchant is verified',
          },
          commissionRate: {
            type: 'number',
            description: 'Platform commission rate',
          },
        },
      },
      Category: {
        type: 'object',
        required: ['name'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Category ID',
          },
          name: {
            type: 'string',
            description: 'Category name',
          },
          description: {
            type: 'string',
            description: 'Category description',
          },
          icon: {
            type: 'string',
            description: 'Category icon URL',
          },
        },
      },
      Offer: {
        type: 'object',
        required: ['title', 'discountType', 'discountValue', 'startTime', 'endTime'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Offer ID',
          },
          title: {
            type: 'string',
            description: 'Offer title',
          },
          description: {
            type: 'string',
            description: 'Offer description',
          },
          discountType: {
            type: 'string',
            enum: ['PERCENTAGE', 'FIXED'],
            description: 'Type of discount',
          },
          discountValue: {
            type: 'number',
            description: 'Discount value',
          },
          startTime: {
            type: 'string',
            format: 'date-time',
            description: 'Offer start time',
          },
          endTime: {
            type: 'string',
            format: 'date-time',
            description: 'Offer end time',
          },
          isActive: {
            type: 'boolean',
            description: 'Whether the offer is active',
          },
        },
      },
      ExploreOption: {
        type: 'object',
        required: ['name', 'type'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Explore option ID',
          },
          name: {
            type: 'string',
            description: 'Name of the location',
          },
          image: {
            type: 'string',
            description: 'Image URL',
          },
          description: {
            type: 'string',
            description: 'Location description',
          },
          location: {
            type: 'object',
            properties: {
              lat: {
                type: 'number',
                description: 'Latitude',
              },
              lng: {
                type: 'number',
                description: 'Longitude',
              },
            },
          },
          type: {
            type: 'string',
            description: 'Type of location (e.g., Mall, Market)',
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
      ProductDetails: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Product ID' },
          name: { type: 'string', description: 'Product name' },
          description: { type: 'string', description: 'Product description' },
          price: { type: 'number', description: 'Product price' },
          salePrice: { type: 'number', description: 'Sale price if discounted' },
          images: { type: 'array', items: { type: 'string' }, description: 'Product images' },
          category: { $ref: '#/components/schemas/Category' },
          merchant: { $ref: '#/components/schemas/Merchant' },
          offer: { $ref: '#/components/schemas/Offer' },
          isFavorite: { type: 'boolean', description: 'Is product in user favorites' },
          similarProducts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                price: { type: 'number' },
                salePrice: { type: 'number' },
                images: { type: 'array', items: { type: 'string' } }
              }
            },
            description: 'Similar products in the same category'
          }
        }
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