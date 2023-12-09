import { SQSEvent } from 'aws-lambda/trigger/sqs';
import { IProductInput } from '../utils/interfaces';
import ProductSchema from '../schemas/product';
import { sendResponse } from '../utils/helpers';
import {
  ErrorMessages,
  ProductNotification,
  StatusCodes,
} from '../utils/constants';
import { APIGatewayProxyResult } from 'aws-lambda';
import { createProduct } from '../lib/dbUtils';
import { sendToSNS } from '../lib/sns';

const { PRODUCT_TOPIC_ARN } = process.env;

export const handler = async (
  event: SQSEvent
): Promise<APIGatewayProxyResult | boolean> => {
  console.log(`catalogBatchProcess, event: ${JSON.stringify(event)}`);

  try {
    const productsList = event.Records.map(({ body }) => body);
    let createProductInput: IProductInput;

    for (const product of productsList) {
      try {
        createProductInput = JSON.parse(product || '');
        const { value, error } = ProductSchema.validate(createProductInput, {
          abortEarly: false,
        });

        if (error) {
          return sendResponse(StatusCodes.BAD_REQUEST, {
            message: ErrorMessages.PRODUCT_CREATE_ERROR,
          });
        }
        const newProduct = await createProduct(createProductInput);
        const snsResult = await sendToSNS(
          PRODUCT_TOPIC_ARN!,
          JSON.stringify(newProduct),
          ProductNotification.SUCCESS,
          {
            count: {
              DataType: 'Number',
              StringValue: `${newProduct.count}`,
            },
          }
        );
        console.log('SNS result', snsResult);
      } catch (error) {
        const snsResult = await sendToSNS(
          PRODUCT_TOPIC_ARN!,
          JSON.stringify({
            productData: product,
            error: (error as Error).message || 'Invalid product data',
          }),
          ProductNotification.ERROR,
          {
            hasError: {
              DataType: 'String',
              StringValue: 'true',
            },
          }
        );
        console.log('SNS result', snsResult);
      }
    }
    return true;
  } catch {
    return false;
  }
};
