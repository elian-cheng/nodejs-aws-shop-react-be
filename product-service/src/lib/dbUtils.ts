import {
  DynamoDBClient,
  ScanCommand,
  TransactWriteItemsCommand,
  BatchGetItemCommand,
  BatchGetItemCommandOutput,
} from '@aws-sdk/client-dynamodb';
import { randomUUID } from 'node:crypto';
import { ErrorMessages, Table } from '../utils/constants';
import {
  IAvailableProduct,
  IDBQueryOutput,
  IDBScanOutput,
  IProduct,
  IProductInput,
  IStock,
} from '../utils/interfaces';

const dbClient = new DynamoDBClient();

export const getProductsList = async (): Promise<IAvailableProduct[]> => {
  const { Items: productItems } = (await dbClient.send(
    new ScanCommand({
      TableName: Table.PRODUCTS,
    })
  )) as IDBScanOutput<IProduct>;

  const { Items: stockItems } = (await dbClient.send(
    new ScanCommand({
      TableName: Table.STOCKS,
    })
  )) as IDBQueryOutput<IStock>;

  const products = productItems ?? [];
  const stocks = stockItems ?? [];

  const availableProducts: IAvailableProduct[] = products.map((p) => {
    const stock = stocks.find((s) => s.product_id === p.id);
    return {
      ...p,
      count: stock?.count || 0,
    };
  });

  return availableProducts;
};

export const getProductById = async (
  id: string
): Promise<IAvailableProduct> => {
  const { Responses } = (await dbClient.send(
    new BatchGetItemCommand({
      RequestItems: {
        [Table.PRODUCTS]: {
          Keys: [{ id: { S: id } }],
        },
        [Table.STOCKS]: {
          Keys: [{ product_id: { S: id } }],
        },
      },
    })
  )) as BatchGetItemCommandOutput;

  const productResponse = Responses?.[Table.PRODUCTS]?.[0];
  const stockResponse = Responses?.[Table.STOCKS]?.[0];

  if (!productResponse) {
    throw new Error(ErrorMessages.PRODUCT_NOT_FOUND);
  }

  const product: IProduct = {
    id: productResponse.id.S as string,
    title: productResponse.title.S as string,
    description: productResponse.description.S as string,
    price: parseFloat(productResponse.price.N as string),
  };

  const stock: IStock = {
    product_id: stockResponse?.product_id.S as string,
    count: stockResponse?.count.N
      ? parseInt(stockResponse.count.N as string, 10)
      : 0,
  };

  const availableProduct: IAvailableProduct = {
    ...product,
    count: stock.count,
  };

  return availableProduct;
};

export const createProduct = async (
  product: IProductInput
): Promise<IAvailableProduct> => {
  const newProductId: string = randomUUID();

  await dbClient.send(
    new TransactWriteItemsCommand({
      TransactItems: [
        {
          Put: {
            TableName: Table.PRODUCTS,
            Item: {
              id: { S: newProductId },
              title: { S: product.title },
              description: { S: product.description },
              price: { N: product.price.toString() },
            },
          },
        },
        {
          Put: {
            TableName: Table.STOCKS,
            Item: {
              product_id: { S: newProductId },
              count: { N: product.count.toString() },
            },
          },
        },
      ],
    })
  );

  return {
    id: newProductId,
    ...product,
  };
};
