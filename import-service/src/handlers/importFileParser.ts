import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sendResponse } from '../utils/helpers';
import ImportUrl from '../schemas/import';
import { ErrorMessages, StatusCodes } from '../utils/constants';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log(`lambda: createProduct, event: ${JSON.stringify(event)}`);

  try {
    const body = JSON.parse(event.body || '{}');
    const { value, error } = ImportUrl.validate(body, {
      abortEarly: false,
    });

    if (error) {
      return sendResponse(StatusCodes.BAD_REQUEST, {
        message: ErrorMessages.PRODUCT_CREATE_ERROR,
      });
    }

    const createdProduct = {};

    return sendResponse(StatusCodes.CREATED, createdProduct);
  } catch (e) {
    return sendResponse(StatusCodes.INTERNAL_ERROR, {
      message: ErrorMessages.INTERNAL_SERVER_ERROR,
    });
  }
};
