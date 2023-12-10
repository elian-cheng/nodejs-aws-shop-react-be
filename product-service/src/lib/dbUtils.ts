import {
  DynamoDBClient,
  ScanCommand,
  TransactWriteItemsCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { IAvailableProduct, IProduct, IStock } from '../utils/interfaces';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const dbClient = new DynamoDBClient({
  region: 'eu-north-1',
});
const productsTableName = process.env.PRODUCTS_TABLE_NAME ?? '';
const stocksTableName = process.env.STOCKS_TABLE_NAME ?? '';

export const getProductsList = async (): Promise<IAvailableProduct[]> => {
  try {
    const { Items: productItems } = await dbClient.send(
      new ScanCommand({
        TableName: productsTableName,
      })
    );

    const { Items: stockItems } = await dbClient.send(
      new ScanCommand({
        TableName: stocksTableName,
      })
    );

    const products = (productItems ?? []).map((p) => unmarshall(p) as IProduct);
    const stocks = (stockItems ?? []).map((s) => unmarshall(s) as IStock);

    if (!products.length) {
      return [];
    }

    const availableProducts: IAvailableProduct[] = products.map((p) => {
      const stock = stocks.find((s) => s.product_id === p.id);
      return {
        ...p,
        count: stock?.count || 0,
      };
    });

    return availableProducts;
  } catch (e) {
    throw e;
  }
};

export const getProductById = async (
  key: string,
  value: string,
  TableName: string
) => {
  const command = new QueryCommand({
    TableName,
    KeyConditionExpression: `${key} = :id`,
    ExpressionAttributeValues: { ':id': { S: value } },
  });
  const res = await dbClient.send(command);
  return res.Items?.[0] ? unmarshall(res.Items[0]) : null;
};

export async function createProduct(
  product: IProduct,
  stock: IStock,
  productsTableName: string,
  stocksTableName: string
): Promise<IAvailableProduct> {
  const transactItems = [
    {
      Put: {
        TableName: productsTableName,
        Item: marshall(product),
      },
    },
    {
      Put: {
        TableName: stocksTableName,
        Item: marshall(stock),
      },
    },
  ];

  try {
    const command = new TransactWriteItemsCommand({
      TransactItems: transactItems,
    });
    await dbClient.send(command);
    return {
      ...product,
      count: stock.count,
    };
  } catch (err) {
    console.log(err);
    throw err;
  }
}
