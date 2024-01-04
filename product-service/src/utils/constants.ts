export const PRIMARY_EMAIL = 'chernega.o@gmail.com';
export const SECONDARY_EMAIL = 'eliang.cheng@gmail.com';
export const FILTER_COUNT = 5;
export const REGION = 'eu-north-1';

export enum Table {
  PRODUCTS = 'products',
  STOCKS = 'stocks',
}

export enum ProductNotification {
  SUCCESS = 'New product added to Elian Rss catalog',
  ERROR = 'An error occurred adding a new product to Elian Rss catalog',
}

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
