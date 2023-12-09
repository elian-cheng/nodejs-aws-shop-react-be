import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as apiGateway from '@aws-cdk/aws-apigatewayv2-alpha';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import {
  NodejsFunction,
  NodejsFunctionProps,
} from 'aws-cdk-lib/aws-lambda-nodejs';
import { TableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { REGION } from './src/utils/constants';

const API_NAME = 'products';
const API_PATH = `/${API_NAME}`;

const app = new cdk.App();
const stack = new cdk.Stack(app, 'ElianRssProductServiceStack', {
  env: { region: REGION },
});

const catalogProductsDLQ = new sqs.Queue(stack, 'ElianRssCatalogProductsDLQ', {
  queueName: 'catalog-products-dlq.fifo',
  fifo: true,
});

const catalogProductsQueue = new sqs.Queue(
  stack,
  'ElianRssCatalogProductsQueue',
  {
    queueName: 'catalog-products-queue.fifo',
    fifo: true,
    deadLetterQueue: {
      maxReceiveCount: 3,
      queue: catalogProductsDLQ,
    },
  }
);

const createProductTopic = new sns.Topic(stack, 'CreateProductTopic', {
  topicName: 'create-product-topic',
});

new sns.Subscription(stack, 'ElianRssMainEmailSubscription', {
  endpoint: process.env.MAIN_EMAIL || '',
  protocol: sns.SubscriptionProtocol.EMAIL,
  topic: createProductTopic,
  filterPolicy: {
    count: sns.SubscriptionFilter.numericFilter({
      between: { start: 1, stop: 10 },
    }),
  },
});

const productsTable = TableV2.fromTableName(stack, 'ProductTable', 'products');
const stocksTable = TableV2.fromTableName(stack, 'StocksTable', 'stocks');

const sharedLambdaProps: Partial<NodejsFunctionProps> = {
  runtime: lambda.Runtime.NODEJS_18_X,
  environment: {
    PRODUCT_AWS_REGION: REGION,
    PRODUCTS_TABLE_NAME: productsTable.tableName,
    STOCKS_TABLE_NAME: stocksTable.tableName,
    PRODUCT_TOPIC_ARN: createProductTopic.topicArn,
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

const createProduct = new NodejsFunction(stack, 'CreateProductLambda', {
  ...sharedLambdaProps,
  functionName: 'createProduct',
  entry: 'src/handlers/createProduct.ts',
});

const catalogBatchProcess = new NodejsFunction(
  stack,
  'CatalogBatchProcessLambda',
  {
    ...sharedLambdaProps,
    functionName: 'catalogBatchProcess',
    entry: 'src/handlers/catalogBatchProcess.ts',
  }
);

productsTable.grantReadData(getProductsList);
stocksTable.grantReadData(getProductsList);

productsTable.grantReadData(getProductsById);
stocksTable.grantReadData(getProductsById);

productsTable.grantWriteData(createProduct);
stocksTable.grantWriteData(createProduct);

createProductTopic.grantPublish(catalogBatchProcess);

catalogBatchProcess.addEventSource(
  new SqsEventSource(catalogProductsQueue, {
    batchSize: 5,
  })
);

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

api.addRoutes({
  path: API_PATH,
  methods: [apiGateway.HttpMethod.POST],
  integration: new HttpLambdaIntegration(
    'CreateProductLambdaIntegration',
    createProduct
  ),
});

new cdk.CfnOutput(stack, 'ApiUrl', {
  value: `${api.url}${API_NAME}`,
});

new cdk.CfnOutput(stack, 'QueueArn', {
  value: `Queue: ${catalogProductsQueue.queueName} arn: ${catalogProductsQueue.queueArn}`,
});

new cdk.CfnOutput(stack, 'DLQArn', {
  value: `DLQ: ${catalogProductsDLQ.queueName} arn: ${catalogProductsDLQ.queueArn}`,
});

new cdk.CfnOutput(stack, 'SNSArn', {
  value: `SNS name: ${createProductTopic.topicName} arn: ${createProductTopic.topicArn}`,
});
