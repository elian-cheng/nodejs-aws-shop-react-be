import * as cdk from 'aws-cdk-lib';
import * as apiGateway from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import {
  NodejsFunction,
  NodejsFunctionProps,
} from 'aws-cdk-lib/aws-lambda-nodejs';

const API_NAME = 'products';
const API_PATH = `/${API_NAME}`;

const app = new cdk.App();
const stack = new cdk.Stack(app, 'ElianRssProductServiceStack', {
  env: { region: 'eu-north-1' },
});

const sharedLambdaProps: Partial<NodejsFunctionProps> = {
  runtime: lambda.Runtime.NODEJS_18_X,
  environment: {
    PRODUCT_AWS_REGION: 'eu-north-1',
  },
};

const getProductsList = new NodejsFunction(stack, 'GetProductsListLambda', {
  ...sharedLambdaProps,
  functionName: 'getProductsList',
  entry: 'src/handlers/getProductsList.ts',
});

const getProductsById = new NodejsFunction(stack, 'GetProductsByIdLambda', {
  ...sharedLambdaProps,
  functionName: 'getProductsById',
  entry: 'src/handlers/getProductsById.ts',
});

const api = new apiGateway.HttpApi(stack, 'ProductApi', {
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
    'GetProductsListLambdaIntegration',
    getProductsList
  ),
});

api.addRoutes({
  path: `${API_PATH}/{productId}`,
  methods: [apiGateway.HttpMethod.GET],

  integration: new HttpLambdaIntegration(
    'GetProductsByIdIntegration',
    getProductsById
  ),
});

new cdk.CfnOutput(stack, 'ApiUrl', {
  value: `${api.url}${API_NAME}`,
});
