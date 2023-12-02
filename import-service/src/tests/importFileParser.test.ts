import { handler } from '../handlers/importFileParser';
import { S3Event } from 'aws-lambda';
import { Readable } from 'stream';

import * as helpers from '../utils/helpers';
import * as s3helpers from '../utils/s3helpers';

const mockSuccessEvent: S3Event = {
  Records: [
    {
      eventVersion: '2.1',
      eventSource: 'aws:s3',
      awsRegion: 'mock-region',
      eventTime: '',
      eventName: 'ObjectCreated:Put',
      userIdentity: { principalId: '' },
      requestParameters: { sourceIPAddress: '' },
      responseElements: { 'x-amz-request-id': '', 'x-amz-id-2': '' },
      s3: {
        s3SchemaVersion: '1.0',
        configurationId: 'mock-config-id',
        bucket: {
          name: 'mock-bucket',
          ownerIdentity: { principalId: '' },
          arn: '',
        },
        object: {
          key: 'uploaded/test.csv',
          size: 1,
          eTag: '',
          sequencer: '',
        },
      },
    },
  ],
};

const mockStream = new Readable();

jest.mock('../utils/helpers');
jest.mock('../utils/s3helpers');

describe('ImportFileParser Lambda', () => {
  let spyOnReadCSVFileStream: jest.SpyInstance;
  let spyOnGetS3ReadStream: jest.SpyInstance;

  beforeAll(() => {
    spyOnReadCSVFileStream = jest.spyOn(helpers, 'readCSVFileStream');
    spyOnGetS3ReadStream = jest.spyOn(s3helpers, 'getS3ReadStream');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully process the S3 object and call readCSVFileStream', async () => {
    spyOnGetS3ReadStream.mockResolvedValue(mockStream);
    spyOnReadCSVFileStream.mockResolvedValue(true);

    await handler(mockSuccessEvent);

    expect(spyOnReadCSVFileStream).toHaveBeenCalledTimes(1);
    expect(spyOnGetS3ReadStream).toHaveBeenCalledTimes(1);
  });

  it('should handle a failure in getS3ReadStream', async () => {
    spyOnGetS3ReadStream.mockRejectedValue(
      new Error('Failed to get S3 stream')
    );

    try {
      await handler(mockSuccessEvent);
    } catch (err: unknown) {
      const error = err as Error;
      expect(error.message).toBe('Failed to get S3 stream');
    }

    expect(spyOnReadCSVFileStream).not.toHaveBeenCalled();
    expect(spyOnGetS3ReadStream).toHaveBeenCalledTimes(1);
  });

  it('should handle a failure in readCSVFileStream', async () => {
    spyOnGetS3ReadStream.mockResolvedValue(mockStream);
    spyOnReadCSVFileStream.mockRejectedValue(
      new Error('Failed to read CSV file')
    );

    try {
      await handler(mockSuccessEvent);
    } catch (err: unknown) {
      const error = err as Error;
      expect(error.message).toBe('Failed to read CSV file');
    }

    expect(spyOnReadCSVFileStream).toHaveBeenCalledTimes(1);
    expect(spyOnGetS3ReadStream).toHaveBeenCalledTimes(1);
  });

  it('should handle an invalid S3 event format', async () => {
    const invalidEvent = { Records: [] };
    await expect(handler(invalidEvent)).resolves.toBeUndefined();

    expect(spyOnReadCSVFileStream).not.toHaveBeenCalled();
    expect(spyOnGetS3ReadStream).not.toHaveBeenCalled();
  });
});
