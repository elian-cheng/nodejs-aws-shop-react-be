import {
  APIGatewayAuthorizerResult,
  APIGatewayRequestAuthorizerEvent,
} from 'aws-lambda';
import { generatePolicy } from '../utils/helpers';

export const handler = async (
  event: APIGatewayRequestAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  try {
    console.log('BasicAuthorizer:', JSON.stringify(event));

    const authorizationToken = event.headers?.authorization;
    if (!authorizationToken) {
      throw new Error('Unauthorized');
    }

    const [authType, encodedToken] = authorizationToken.split(' ');
    if (authType !== 'Basic' || !encodedToken) {
      return generatePolicy(authorizationToken, 'Deny', event.methodArn);
    }

    const [username, password] = Buffer.from(encodedToken, 'base64')
      .toString('utf8')
      .split(':');
    const storedPassword = process.env[username.toLowerCase()];
    const effect =
      storedPassword && storedPassword === password ? 'Allow' : 'Deny';

    const policy = generatePolicy(authorizationToken, effect, event.methodArn);
    return policy;
  } catch (err: unknown) {
    const error = err as Error;
    console.error('An error occurred:', error.message);
    throw new Error('Unauthorized');
  }
};
