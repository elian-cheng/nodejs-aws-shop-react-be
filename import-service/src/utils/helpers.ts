import { StatusCodes } from './constants';
import { Readable } from 'stream';
import csv from 'csv-parser';
import { ICsvRow } from './interfaces';
import { moveS3Object } from './s3helpers';
import { fileTypeFromBuffer, FileTypeResult } from 'file-type';

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

export const readCSVFileStream = async (
  stream: Readable,
  bucket?: string,
  from?: string,
  to?: string
): Promise<void> => {
  await new Promise((res, rej) => {
    stream
      .pipe(csv())
      .on('data', (data: ICsvRow) => {
        console.log('CSV Data:', data);
      })
      .on('end', async () => {
        console.log('End of the stream reached');
        if (bucket && from && to) {
          await moveS3Object({ from, to, bucket });
          console.log('File moved');
        }
        res(true);
      })
      .on('error', (err: unknown) => {
        const error = err as Error;
        console.error('Error during CSV parsing:', error);
        rej(error);
      });
  });
};
