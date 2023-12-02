export enum StatusCodes {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  NOT_FOUND = 404,
  INTERNAL_ERROR = 500,
}

export enum ErrorMessages {
  PRODUCT_ID_NOT_DEFINED = 'Product id is not defined',
  PRODUCT_NOT_FOUND = 'Product not found',
  PRODUCT_CREATE_ERROR = 'Product data is absent or incorrect',
  INTERNAL_SERVER_ERROR = 'Internal server error',
}

export enum ImportFolders {
  UPLOADED = 'uploaded/',
  PARSED = 'parsed/',
}

export const URL_EXPIRATION_TIME_SECONDS = 15 * 60;
export const REGION = 'eu-north-1';
