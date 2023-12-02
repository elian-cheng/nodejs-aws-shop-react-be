import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sendResponse } from '../utils/helpers';
import { ErrorMessages, StatusCodes } from '../utils/constants';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log(`lambda: getProductsList, event: ${JSON.stringify(event)}`);

  try {
    const availableProducts = [
      { id: 1, title: `Product 1` },
      { id: 2, title: `Product 2` },
    ];
    return sendResponse(StatusCodes.OK, availableProducts);
  } catch (e) {
    return sendResponse(StatusCodes.INTERNAL_ERROR, {
      message: ErrorMessages.INTERNAL_SERVER_ERROR,
    });
  }
};
