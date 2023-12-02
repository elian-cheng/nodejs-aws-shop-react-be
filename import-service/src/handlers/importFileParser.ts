import { S3Event } from 'aws-lambda';
import { readCSVFileStream } from '../utils/helpers';
import { ImportFolders } from '../utils/constants';
import { getS3ReadStream } from '../utils/s3helpers';

export const handler = async (event: S3Event): Promise<void> => {
  try {
    console.log('Received S3 event:', JSON.stringify(event));

    if (!event.Records || event.Records.length === 0) {
      console.error('Invalid S3 event format. Missing Records array.');
      return;
    }

    const bucket = event.Records[0].s3.bucket.name;
    const fileName = decodeURIComponent(
      event.Records[0].s3.object.key.replace(/\+/g, ' ')
    );

    const rawStream = await getS3ReadStream({
      bucket,
      fileName,
    });

    if (!rawStream) {
      console.error('Failed to retrieve S3 stream for', fileName);
      return;
    }

    await readCSVFileStream(
      rawStream,
      bucket,
      fileName,
      fileName.replace(ImportFolders.UPLOADED, ImportFolders.PARSED)
    );

    console.log('Processing complete:', fileName);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('An error occurred:', error.message);
  }
};
