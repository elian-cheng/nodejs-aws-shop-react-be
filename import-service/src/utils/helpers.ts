import { StatusCodes } from './constants';
import { Readable } from 'stream';
import csv from 'csv-parser';
import { ICsvRow } from './interfaces';
import { moveS3Object } from './s3helpers';
import ProductSchema from '../schemas/product';
import Joi from 'joi';

export type ValidationError = string;
export type ValidationResult<T> =
  | {
      success: true;
      data: T;
    }
  | { success: false; errors: ValidationError[] };

const validatePayload = async <T>(
  payload: unknown,
  schema: Joi.ObjectSchema<T>
): Promise<ValidationResult<T>> => {
  try {
    const value = await schema.validateAsync(payload, { abortEarly: false });
    return { success: true, data: value };
  } catch (error) {
    const validationError = error as Joi.ValidationError;
    const errorMessages = validationError.details.map(
      (detail) => detail.message
    );
    return { success: false, errors: errorMessages };
  }
};

const validateCsvRow = async (
  row: ICsvRow
): Promise<ValidationResult<ICsvRow>> => {
  return validatePayload<ICsvRow>(row, ProductSchema);
};

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
  const rows: ICsvRow[] = [];

  const parser = stream.pipe(csv());

  parser
    .on('data', (data: ICsvRow) => {
      console.log('CSV Data:', data);
      rows.push(data);
    })
    .on('end', async () => {
      console.log('End of the stream reached');

      const validationResults = await Promise.all(
        rows.map((row) => validateCsvRow(row))
      );

      const invalidRows = validationResults.filter((result) => !result.success);

      const errorMessages = invalidRows.flatMap((result) =>
        result.success ? [] : result.errors
      );

      if (errorMessages.length > 0) {
        console.error('Validation error:', errorMessages.join(', '));
        return Promise.reject(new Error('CSV validation error'));
      }

      if (bucket && from && to) {
        await moveS3Object({ from, to, bucket });
        console.log('File moved');
      }

      return Promise.resolve();
    })
    .on('error', (err: unknown) => {
      const error = err as Error;
      console.error('Error during CSV parsing:', error);
      return Promise.reject(error);
    });
};
