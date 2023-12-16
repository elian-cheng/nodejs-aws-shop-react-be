import { SQSEvent } from 'aws-lambda/trigger/sqs';
import { sendResponse, transformRecords } from '../utils/helpers';
import { ProductNotification, StatusCodes } from '../utils/constants';
import { APIGatewayProxyResult } from 'aws-lambda';
import { createProduct } from '../lib/dbUtils';
import { sendToSNS } from '../lib/sns';

const { PRODUCTS_TABLE_NAME, STOCKS_TABLE_NAME, PRODUCT_TOPIC_ARN } =
  process.env;

export const handler = async (
  event: SQSEvent
): Promise<APIGatewayProxyResult | boolean> => {
  console.log(`catalogBatchProcess, event: ${JSON.stringify(event)}`);

  const { Records = [] } = event;

  for (const record of Records) {
    try {
      const [product, stock] = transformRecords(record);
      const createdProduct = await createProduct(
        product,
        stock,
        PRODUCTS_TABLE_NAME!,
        STOCKS_TABLE_NAME!
      );
      const snsResult = await sendToSNS(
        PRODUCT_TOPIC_ARN!,
        JSON.stringify(createdProduct),
        ProductNotification.SUCCESS,
        {
          count: {
            DataType: 'Number',
            StringValue: createdProduct.count.toString(),
          },
        }
      );
      console.log('snsResult', snsResult);
    } catch (e) {
      return sendResponse(StatusCodes.INTERNAL_ERROR, {
        message: ProductNotification.ERROR,
      });
    }
  }
  return true;
};
