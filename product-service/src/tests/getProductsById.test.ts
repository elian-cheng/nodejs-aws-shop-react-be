import { APIGatewayProxyEvent } from 'aws-lambda';
import productData from '../lib/data';
import { handler } from '../handlers/getProductsById';

const createMockEvent = (
  productId: string | undefined
): APIGatewayProxyEvent => ({
  pathParameters: { productId },
  body: '',
  headers: {},
  multiValueHeaders: {},
  httpMethod: 'GET',
  isBase64Encoded: false,
  path: '/products/1',
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  requestContext: {} as any,
  resource: 'mock-resource',
});

describe('getProductsById', () => {
  it('Should return a product with a given ID', async () => {
    const mockEvent = createMockEvent(productData[0].id);
    const response = await handler(mockEvent);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(productData[0]);
  });

  it('Should return a 404 error for a nonexistent product ID', async () => {
    const mockEvent = createMockEvent('no-product-id');
    const response = await handler(mockEvent);

    expect(response.statusCode).toBe(404);
    expect(response.body).toContain('Product not found');
  });

  it('Should return a 404 error for a missing product ID', async () => {
    const mockEvent = createMockEvent(undefined);
    const response = await handler(mockEvent);

    expect(response.statusCode).toBe(404);
    expect(response.body).toContain('Product not found');
  });

  it('Should handle unexpected errors and return 500 status code', async () => {
    const mockError = new Error('Unexpected error');
    jest.spyOn(productData, 'find').mockImplementation(() => {
      throw mockError;
    });

    const result = await handler(createMockEvent(productData[0].id));

    expect(result.statusCode).toBe(500);
    expect(result.body).toContain('Unexpected error');
  });
});
