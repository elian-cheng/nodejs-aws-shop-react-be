import * as cdk from 'aws-cdk-lib';
import * as apiGateway from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3notifications from 'aws-cdk-lib/aws-s3-notifications';
import {
  NodejsFunction,
  NodejsFunctionProps,
} from 'aws-cdk-lib/aws-lambda-nodejs';
import { REGION } from './src/utils/constants';

const API_NAME = 'import';
const API_PATH = `/${API_NAME}`;

const app = new cdk.App();
const stack = new cdk.Stack(app, 'ElianRssImportServiceStack', {
  env: { region: REGION },
});

const bucket = new s3.Bucket(stack, 'ElianRssImportBucket', {
  bucketName: 'elian-rss-import-bucket',
  autoDeleteObjects: true,
  cors: [
    {
      allowedHeaders: ['*'],
      allowedMethods: [
        s3.HttpMethods.PUT,
        s3.HttpMethods.POST,
        s3.HttpMethods.GET,
        s3.HttpMethods.DELETE,
        s3.HttpMethods.HEAD,
      ],
      allowedOrigins: ['*'],
    },
  ],
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

const sharedLambdaProps: Partial<NodejsFunctionProps> = {
  runtime: lambda.Runtime.NODEJS_18_X,
  environment: {
    PRODUCT_AWS_REGION: REGION,
    IMPORT_BUCKET_NAME: bucket.bucketName,
  },
};

const importFileParser = new NodejsFunction(stack, 'ImportFileParserLambda', {
  ...sharedLambdaProps,
  functionName: 'importFileParser',
  entry: 'src/handlers/importFileParser.ts',
});

const importProductsFile = new NodejsFunction(
  stack,
  'ImportProductsFileLambda',
  {
    ...sharedLambdaProps,
    functionName: 'importProductsFile',
    entry: 'src/handlers/importProductsFile.ts',
  }
);

bucket.addEventNotification(
  s3.EventType.OBJECT_CREATED,
  new s3notifications.LambdaDestination(importFileParser),
  {
    prefix: 'uploaded',
  }
);

bucket.grantReadWrite(importProductsFile);
bucket.grantReadWrite(importFileParser);
bucket.grantDelete(importFileParser);

const api = new apiGateway.HttpApi(stack, 'ImportApi', {
  corsPreflight: {
    allowHeaders: ['*'],
    allowMethods: [apiGateway.CorsHttpMethod.ANY],
    allowOrigins: ['*'],
  },
});

api.addRoutes({
  path: API_PATH,
  methods: [apiGateway.HttpMethod.GET],
  integration: new HttpLambdaIntegration(
    'ImportProductsFileLambdaIntegration',
    importProductsFile
  ),
});

new cdk.CfnOutput(stack, 'ApiUrl', {
  value: `${api.url}${API_NAME}`,
});
