import { handler } from '../handlers/catalogBatchProcess';
import * as dbUtils from '../lib/dbUtils';
import * as sns from '../lib/sns';
import { SQSEvent, SQSRecord } from 'aws-lambda';

interface IProduct {
  id: string;
  title: string;
  description: string;
  price: number;
}

interface IStock {
  product_id: string;
  count: number;
}

interface IAvailableProduct extends IProduct {
  count: number;
}

export const mockEvent: SQSEvent = {
  Records: [
    generateMockSQSRecord(
      '123',
      '{"title":"iPhone 13","price":999.99,"count":50}',
      'aws:sqs',
      'test.fifo',
      'test-1'
    ),
    generateMockSQSRecord(
      '456',
      '{"title":"ThinkPad X1 Carbon","price":1299.99,"count":20}',
      'aws:sqs',
      'test.fifo',
      'test-1'
    ),
  ],
};

function generateMockSQSRecord(
  messageId: string,
  body: string,
  eventSource: string,
  eventSourceARN: string,
  awsRegion: string
): SQSRecord {
  return {
    messageId,
    receiptHandle: `valid_receipt_handle_${messageId}`,
    body,
    attributes: {} as any,
    messageAttributes: {},
    md5OfBody: '',
    eventSource,
    eventSourceARN,
    awsRegion,
  };
}

jest.mock('../lib/dbUtils');
jest.mock('../lib/sns');

describe('catalogBatchProcess', () => {
  let createProductSpy: jest.SpyInstance;
  let sendToSNSSpy: jest.SpyInstance;

  beforeAll(() => {
    createProductSpy = jest.spyOn(dbUtils, 'createProduct');
    sendToSNSSpy = jest.spyOn(sns, 'sendToSNS');
  });

  afterEach(() => {
    createProductSpy.mockClear();
    sendToSNSSpy.mockClear();
  });

  afterAll(() => {
    createProductSpy.mockRestore();
    sendToSNSSpy.mockRestore();
  });

  it('should process SQS records and send messages to SNS', async () => {
    createProductSpy.mockImplementation(
      (product, stock, productsTableName, stocksTableName) => {
        return Promise.resolve({
          id: product.id,
          title: product.title,
          description: product.description,
          price: product.price,
          count: stock.count,
        });
      }
    );

    sendToSNSSpy.mockResolvedValue({
      MessageId: 'mockedMessageId',
    });

    const result = await handler(mockEvent);

    expect(result).toBe(true);
    expect(createProductSpy).toHaveBeenCalledTimes(mockEvent.Records.length);
    expect(sendToSNSSpy).toHaveBeenCalledTimes(mockEvent.Records.length);
  });

  it('should handle unexpected errors', async () => {
    createProductSpy.mockImplementationOnce(() => {
      throw new Error('Simulated unexpected error');
    });

    sendToSNSSpy.mockResolvedValue({
      MessageId: 'mockedMessageId',
    });

    const result = await handler(mockEvent);

    expect(result).toEqual({
      statusCode: 500,
      body: JSON.stringify({
        message: 'An error occurred adding a new product to Elian Rss catalog',
      }),
      headers: {
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*',
        'Access-Control-Allow-Origin': '*',
      },
    });

    expect(createProductSpy).toHaveBeenCalledTimes(1);
    expect(sendToSNSSpy).not.toHaveBeenCalled();
  });
});
