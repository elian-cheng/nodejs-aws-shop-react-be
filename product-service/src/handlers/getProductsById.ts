import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sendResponse } from '../utils/helpers';
import productData from '../lib/data';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const productId = event.pathParameters?.productId;
    if (!productId) {
      return sendResponse(404, 'Product not found');
    }

    const product = productData.find((p) => p.id === productId);

    if (!product) {
      return sendResponse(404, 'Product not found');
    }

    return sendResponse(200, product);
  } catch (err: unknown) {
    const error = err as Error;
    return sendResponse(500, error.message);
  }
};
