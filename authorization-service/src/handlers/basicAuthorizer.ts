import {
  APIGatewayAuthorizerResult,
  APIGatewayRequestAuthorizerEvent,
} from 'aws-lambda';
import { generatePolicy } from '../utils/helpers';

export const handler = async (
  event: APIGatewayRequestAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  let effect: 'Allow' | 'Deny' = 'Deny';
  let authorizationToken: string = '';
  let methodArn: string = '';
  try {
    console.log('BasicAuthorizer:', JSON.stringify(event));

    authorizationToken = event.headers?.authorization || '';
    methodArn = event.methodArn;
    if (!authorizationToken) {
      return generatePolicy(authorizationToken, effect, methodArn);
    }

    const [authType, encodedToken] = authorizationToken.split(' ');
    if (authType !== 'Basic' || !encodedToken) {
      return generatePolicy(authorizationToken, effect, methodArn);
    }

    const [username, password] = Buffer.from(encodedToken, 'base64')
      .toString('utf8')
      .split(':');
    const storedPassword = process.env[username];

    effect = storedPassword && storedPassword === password ? 'Allow' : 'Deny';

    const policy = generatePolicy(authorizationToken, effect, event.methodArn);
    return policy;
  } catch (err: unknown) {
    const error = err as Error;
    console.error('An error occurred:', error.message);
    return generatePolicy(authorizationToken, effect, methodArn);
  }
};
