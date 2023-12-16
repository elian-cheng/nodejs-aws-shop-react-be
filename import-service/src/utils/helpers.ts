import { StatusCodes } from './constants';
import { Readable } from 'stream';
import csv from 'csv-parser';
import { moveS3Object } from './s3helpers';
import ProductSchema from '../schemas/product';
import { sendSQSMessage } from '../lib/sqs';

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

export const getMimeTypeByFileExtension = (fileExt: string): string => {
  switch (fileExt) {
    case 'pdf':
      return 'application/pdf';
    case 'csv':
      return 'text/csv';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'tiff':
      return 'image/tiff';
    case 'png':
      return 'image/png';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    case 'p7s':
      return 'application/pkcs7-signature';
    case 'txt':
    default:
      return 'text/plain';
  }
};

async function* readStream(stream: Readable): AsyncGenerator<any> {
  const iterator = stream[Symbol.asyncIterator]();

  while (true) {
    const { value, done } = await iterator.next();
    if (done) {
      break;
    }
    yield value;
  }
}

export const readCSVFileStream = async (
  stream: Readable,
  bucket?: string,
  from?: string,
  to?: string
): Promise<void> => {
  const parser = stream.pipe(csv());
  for await (const data of readStream(parser)) {
    const { error } = ProductSchema.validate(data);
    if (error) {
      console.log('Validation error', error);
      continue;
    }
    await sendSQSMessage(process.env.PRODUCT_QUEUE!, data);
  }

  console.log('End of the file stream');
  if (bucket && from && to) {
    await moveS3Object({ from, to, bucket });
    console.log('File moved');
  }
};
