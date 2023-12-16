import { SQSRecord } from 'aws-lambda';
import { StatusCodes } from './constants';
import { IProduct, IStock } from './interfaces';

export const sendResponse = (
  statusCode: number = StatusCodes.OK,
  body?: unknown,
  headers?: object
) => {
  return {
    statusCode,
    body: JSON.stringify(body || {}),
    headers: {
      'Access-Control-Allow-Methods': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      ...headers,
    },
  };
};

export function transformRecords(record: SQSRecord): [IProduct, IStock] {
  const { messageId: id } = record;
  const payload = JSON.parse(record.body);

  const { title = '', description = '', price = 0, count = 0 } = payload;

  const product: IProduct = {
    id,
    title,
    description,
    price: +price,
  };

  const stock: IStock = {
    product_id: id,
    count: +count,
  };

  return [product, stock];
}
