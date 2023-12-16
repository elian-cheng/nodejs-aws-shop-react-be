import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import {
  NodejsFunction,
  NodejsFunctionProps,
} from 'aws-cdk-lib/aws-lambda-nodejs';

import * as dotenv from 'dotenv';
import { REGION } from './src/utils/constants';
const environment: dotenv.DotenvPopulateInput = {};
dotenv.config({ processEnv: environment });

const app = new cdk.App();
const stack = new cdk.Stack(app, 'ElianRssAuthorizationServiceStack', {
  env: { region: REGION },
});

const basicAuthorizer = new NodejsFunction(stack, 'BasicAuthorizerLambda', {
  runtime: lambda.Runtime.NODEJS_18_X,
  functionName: 'basicAuthorizer',
  entry: 'src/handlers/basicAuthorizer.ts',
  environment: environment,
});

new cdk.CfnOutput(stack, 'BasicAuthorizerLambdaArn', {
  value: basicAuthorizer.functionArn,
});
