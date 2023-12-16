import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sendResponse } from '../utils/helpers';
import ProductSchema from '../schemas/product';
import { ErrorMessages, StatusCodes } from '../utils/constants';
import { createProduct } from '../lib/dbUtils';
import { IProduct, IStock } from '../utils/interfaces';
import { randomUUID } from 'crypto';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log(`createProduct, event: ${JSON.stringify(event)}`);

    const body = event.body != null ? JSON.parse(event.body) : {};
    const { value, error } = ProductSchema.validate(body);
    if (error != null) {
      console.log(error.message);
      return sendResponse(StatusCodes.BAD_REQUEST, {
        message: ErrorMessages.PRODUCT_CREATE_ERROR,
      });
    }

    const id = randomUUID();

    const { title, description, price, count } = value;

    const product: IProduct = {
      id,
      title,
      description,
      price,
    };

    const stock: IStock = {
      product_id: id,
      count,
    };

    const createdProduct = {
      id,
      title,
      description,
      price,
      count,
    };

    const res = await createProduct(
      product,
      stock,
      process.env.PRODUCTS_TABLE_NAME!,
      process.env.STOCKS_TABLE_NAME!
    );

    console.log(res);

    return sendResponse(StatusCodes.CREATED, createdProduct);
  } catch (e) {
    return sendResponse(StatusCodes.INTERNAL_ERROR, {
      message: ErrorMessages.INTERNAL_SERVER_ERROR,
    });
  }
};
