import * as cdk from 'aws-cdk-lib';
import * as apiGateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3notifications from 'aws-cdk-lib/aws-s3-notifications';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import {
  NodejsFunction,
  NodejsFunctionProps,
} from 'aws-cdk-lib/aws-lambda-nodejs';

import { REGION } from './src/utils/constants';
import { config } from 'dotenv';
config();

const API_NAME = 'import';

const { CREATE_PRODUCT_QUEUE_ARN, AUTHORIZER_LAMBDA_ARN } = process.env;

const app = new cdk.App();
const stack = new cdk.Stack(app, 'ElianRssImportServiceStack', {
  env: { region: REGION },
});

const productQueue = sqs.Queue.fromQueueArn(
  stack,
  'ElianRssProductQueue',
  CREATE_PRODUCT_QUEUE_ARN!
);

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
    PRODUCT_QUEUE: productQueue.queueUrl,
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

const basicAuthorizer = lambda.Function.fromFunctionArn(
  stack,
  'basicAuthorizer',
  AUTHORIZER_LAMBDA_ARN!
);

const authorizer = new apiGateway.TokenAuthorizer(
  stack,
  'ImportServiceAuthorizer',
  {
    handler: basicAuthorizer,
  }
);

new lambda.CfnPermission(stack, 'BasicAuthorizerInvoke Permissions', {
  action: 'lambda:InvokeFunction',
  functionName: basicAuthorizer.functionName,
  principal: 'apigateway.amazonaws.com',
  sourceArn: authorizer.authorizerArn,
});

productQueue.grantSendMessages(importFileParser);

bucket.grantReadWrite(importProductsFile);
bucket.grantReadWrite(importFileParser);
bucket.grantDelete(importFileParser);

bucket.addEventNotification(
  s3.EventType.OBJECT_CREATED,
  new s3notifications.LambdaDestination(importFileParser),
  {
    prefix: 'uploaded',
  }
);

const api = new apiGateway.RestApi(stack, 'ImportApi', {
  defaultCorsPreflightOptions: {
    allowHeaders: ['*'],
    allowOrigins: apiGateway.Cors.ALL_ORIGINS,
    allowMethods: apiGateway.Cors.ALL_METHODS,
  },
});

api.root
  .addResource(API_NAME)
  .addMethod('GET', new apiGateway.LambdaIntegration(importProductsFile), {
    requestParameters: { 'method.request.querystring.name': true },
    authorizer,
  });

api.addGatewayResponse('GatewayResponseUnauthorized', {
  type: apiGateway.ResponseType.UNAUTHORIZED,
  responseHeaders: {
    'Access-Control-Allow-Origin': "'*'",
    'Access-Control-Allow-Headers': "'*'",
    'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE'",
    'Access-Control-Allow-Credentials': "'true'",
  },
});

new cdk.CfnOutput(stack, 'ApiUrl', {
  value: `${api.url}${API_NAME}`,
});

new cdk.CfnOutput(stack, 'AuthorizerArn', {
  value: authorizer.authorizerArn,
});
