export interface IUnknownObj<T = unknown> {
  [key: string]: T;
}
export interface IS3UploadParams {
  bucketName: string;
  objectKey: string;
  metadata?: IUnknownObj<string>;
}

export interface IS3ReadStreamParams {
  bucket: string;
  fileName: string;
}

export interface IS3MoveObjParams {
  bucket: string;
  from: string;
  to: string;
}

export interface ICsvRow {
  [key: string]: string | number | boolean;
}
