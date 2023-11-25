import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sendResponse } from '../utils/helpers';
import { getProductById } from '../lib/dbUtils';
import { ErrorMessages, StatusCodes } from '../utils/constants';

export const handler = async (
  event: Pick<APIGatewayProxyEvent, 'pathParameters'>
): Promise<APIGatewayProxyResult> => {
  console.log(`lambda: getProductsById, event: ${JSON.stringify(event)}`);

  const productId = event.pathParameters?.id?.trim();
  if (!productId) {
    return sendResponse(StatusCodes.BAD_REQUEST, {
      message: ErrorMessages.PRODUCT_ID_NOT_DEFINED,
    });
  }

  try {
    const availableProduct = await getProductById(productId);
    return sendResponse(StatusCodes.OK, availableProduct);
  } catch (e: unknown) {
    const error = e as Error;
    if (error.message === ErrorMessages.PRODUCT_NOT_FOUND) {
      return sendResponse(StatusCodes.NOT_FOUND, {
        message: ErrorMessages.PRODUCT_NOT_FOUND,
      });
    }
    return sendResponse(StatusCodes.INTERNAL_ERROR, {
      message: ErrorMessages.INTERNAL_SERVER_ERROR,
    });
  }
};
