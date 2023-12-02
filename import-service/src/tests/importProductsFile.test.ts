import { handler } from '../handlers/importProductsFile';
import {
  APIGatewayEventRequestContext,
  APIGatewayProxyEvent,
} from 'aws-lambda';

import * as helpers from '../utils/helpers';
import * as s3helpers from '../utils/s3helpers';
import { StatusCodes } from '../utils/constants';

const mockValidEvent: APIGatewayProxyEvent = {
  path: '/import',
  pathParameters: null,
  body: null,
  headers: {},
  multiValueHeaders: {},
  httpMethod: 'GET',
  queryStringParameters: { name: 'test.csv' },
  multiValueQueryStringParameters: null,
  requestContext: {} as APIGatewayEventRequestContext,
  stageVariables: null,
  isBase64Encoded: false,
  resource: 'mock-resource',
};

const mockInvalidExtensionEvent: APIGatewayProxyEvent = {
  path: '/import',
  pathParameters: null,
  body: null,
  headers: {},
  multiValueHeaders: {},
  httpMethod: 'GET',
  queryStringParameters: { name: 'test.xlsx' },
  multiValueQueryStringParameters: null,
  requestContext: {} as APIGatewayEventRequestContext,
  stageVariables: null,
  isBase64Encoded: false,
  resource: 'mock-resource',
};

const mockMissingFileNameEvent: APIGatewayProxyEvent = {
  path: '/import',
  pathParameters: null,
  body: null,
  headers: {},
  multiValueHeaders: {},
  httpMethod: 'GET',
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  requestContext: {} as APIGatewayEventRequestContext,
  stageVariables: null,
  isBase64Encoded: false,
  resource: 'mock-resource',
};

jest.mock('../utils/s3helpers');

describe('ImportProducts Lambda', () => {
  let spyOnBuildResponse: jest.SpyInstance;
  let spyOnGetS3UploadUrl: jest.SpyInstance;

  beforeAll(() => {
    spyOnBuildResponse = jest.spyOn(helpers, 'sendResponse');
    spyOnGetS3UploadUrl = jest.spyOn(s3helpers, 'getS3UploadUrl');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('successfully returns presigned URL when provided with a valid CSV file name', async () => {
    spyOnGetS3UploadUrl.mockResolvedValue('https://test-url');

    const res = await handler(mockValidEvent);

    expect(res.statusCode).toEqual(StatusCodes.OK);
    expect(res.body).toContain('https://test-url');
    expect(spyOnGetS3UploadUrl).toHaveBeenCalledTimes(1);
    expect(spyOnBuildResponse).toHaveBeenCalledTimes(1);
  });

  it('returns error and status 400 when not provided with CSV file name', async () => {
    const res = await handler(mockMissingFileNameEvent);

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res.body).toContain('required');
    expect(spyOnGetS3UploadUrl).not.toHaveBeenCalled();
    expect(spyOnBuildResponse).toHaveBeenCalledTimes(1);
  });

  it('returns error and status 400 when provided with invalid CSV file name', async () => {
    const res = await handler(mockInvalidExtensionEvent);

    expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    expect(res.body).toContain('Only CSV files are allowed');
    expect(spyOnGetS3UploadUrl).not.toHaveBeenCalled();
    expect(spyOnBuildResponse).toHaveBeenCalledTimes(1);
  });

  it('successfully handles S3 errors', async () => {
    spyOnGetS3UploadUrl.mockRejectedValueOnce(
      new Error('Internal server error')
    );

    const res = await handler(mockValidEvent);

    expect(res.statusCode).toEqual(StatusCodes.INTERNAL_ERROR);
    expect(res.body).toContain('Internal server error');
    expect(spyOnBuildResponse).toHaveBeenCalledTimes(1);
  });
});
