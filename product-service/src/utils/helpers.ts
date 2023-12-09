import { StatusCodes } from './constants';

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


