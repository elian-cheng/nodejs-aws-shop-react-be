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
