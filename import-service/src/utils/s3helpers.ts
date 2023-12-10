import { Readable } from 'stream';
import { getMimeTypeByFileExtension } from './helpers';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  IS3MoveObjParams,
  IS3ReadStreamParams,
  IS3UploadParams,
} from './interfaces';
import { REGION, URL_EXPIRATION_TIME_SECONDS } from './constants';
import { S3Event } from 'aws-lambda';

const client = new S3Client({
  region: REGION,
});

export const getS3UploadUrl = async (params: IS3UploadParams) => {
  try {
    const { bucketName, objectKey, metadata = {} } = params;
    const payload = {
      Bucket: bucketName,
      Key: objectKey,
      ContentType: getMimeTypeByFileExtension(
        objectKey?.split('.').pop()?.toString() ?? ''
      ),
      Metadata: metadata,
    };

    const command = new PutObjectCommand(payload);
    const url = await getSignedUrl(client, command, {
      expiresIn: URL_EXPIRATION_TIME_SECONDS,
    });
    return url;
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error generating S3 upload URL:', error.message);
    throw error;
  }
};

export const getS3ReadStream = async (params: IS3ReadStreamParams) => {
  try {
    const input = {
      Bucket: params.bucket,
      Key: decodeURIComponent(params.fileName),
    };

    const command = new GetObjectCommand(input);
    const response = await client.send(command);

    const readStream = response.Body as Readable;
    return readStream;
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error getting S3 read stream:', error.message);
    throw error;
  }
};

export const moveS3Object = async (params: IS3MoveObjParams) => {
  try {
    const { bucket, from, to } = params;
    const copyCommand = new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${from}`,
      Key: to,
    });
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucket,
      Key: from,
    });

    await client.send(copyCommand);
    console.log(`File copied from ${from} to ${to} in bucket ${bucket}`);
    await client.send(deleteCommand);
    console.log(`File deleted from ${from} in bucket ${bucket}`);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error moving S3 object:', error.message);
    throw error;
  }
};

const getBucketAndKey = (event: S3Event) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, ' ')
  );

  return { bucket, key };
};

export const getFileStream = async (
  event: S3Event
): Promise<Readable | null> => {
  try {
    const { bucket, key } = getBucketAndKey(event);

    const s3Client = new S3Client({
      region: REGION,
    });

    const getObjectCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const item = await s3Client.send(getObjectCommand);
    if (item.Body) {
      return item.Body as Readable;
    }

    return null;
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    }

    return null;
  }
};

export const moveFileToParsed = async (event: S3Event) => {
  try {
    const { bucket, key } = getBucketAndKey(event);

    const s3Client = new S3Client({
      region: REGION,
    });

    const copyObjectCommand = new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${encodeURIComponent(key)}`,
      Key: key.replace('uploaded', 'parsed'),
    });

    await s3Client.send(copyObjectCommand);

    const deleteObjectCommand = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3Client.send(deleteObjectCommand);

    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      return { success: false, error: error.message };
    }

    return { success: false, error: 'Moving file error' };
  }
};
