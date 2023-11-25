import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../handlers/getProductsList';
import { IProduct } from '../utils/interfaces';

export const checkRequiredParameters = (
  requiredParams: string[],
  objectToCheck: IProduct
): boolean => {
  return requiredParams.every((param) =>
    Object.prototype.hasOwnProperty.call(objectToCheck, param)
  );
};

const requiredProductParams = ['id', 'title', 'description', 'price'];

const createMockEvent = (): APIGatewayProxyEvent => ({
  pathParameters: {},
  body: '',
  headers: {},
  multiValueHeaders: {},
  httpMethod: 'GET',
  isBase64Encoded: false,
  path: '/products',
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  requestContext: {} as any,
  resource: 'mock-resource',
});

describe('getProductsList', () => {
  it('Should return list of products', async () => {
    const mockEvent = createMockEvent();
    const response = await handler(mockEvent);

    expect(response.statusCode).toBe(200);
    const responseBody = JSON.parse(response.body);

    expect(Array.isArray(responseBody)).toBe(true);
    if (responseBody.length > 0) {
      const [firstElem] = responseBody;
      expect(checkRequiredParameters(requiredProductParams, firstElem)).toBe(
        true
      );
    }
  });
});
