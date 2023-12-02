import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sendResponse } from '../utils/helpers';
import { ErrorMessages, ImportFolders, StatusCodes } from '../utils/constants';
import { getS3UploadUrl } from '../utils/s3helpers';
import ImportUrl from '../schemas/import';

const bucketName = process.env.IMPORT_BUCKET_NAME!;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('ImportProductsFile event:', event);

    const { value, error } = ImportUrl.validate(
      event.queryStringParameters || {}
    );

    if (error != null) {
      console.log('Validation error:', error.message);
      return sendResponse(StatusCodes.BAD_REQUEST, { message: error.message });
    }

    const { name: fileName } = value;

    if (!fileName.toLowerCase().endsWith('.csv')) {
      return sendResponse(StatusCodes.BAD_REQUEST, {
        message: 'Only CSV files are allowed',
      });
    }

    const objectKey = `${ImportFolders.UPLOADED}${fileName}`;
    const url = await getS3UploadUrl({ bucketName, objectKey });

    console.log('Generated S3 upload URL:', url);
    return sendResponse(StatusCodes.OK, { url });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('An error occurred:', error.message);
    return sendResponse(StatusCodes.INTERNAL_ERROR, {
      message: ErrorMessages.INTERNAL_SERVER_ERROR,
    });
  }
};
