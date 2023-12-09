import {
  SNSClient,
  PublishCommand,
  MessageAttributeValue,
} from '@aws-sdk/client-sns';
import { REGION } from '../utils/constants';

const client = new SNSClient({
  region: REGION,
});

export async function sendToSNS(
  TopicArn: string,
  Message: string,
  Subject: string,
  MessageAttributes: Record<string, MessageAttributeValue> = {}
) {
  const payload = {
    TopicArn,
    Message,
    Subject,
    MessageAttributes,
  };
  const command = new PublishCommand(payload);
  const res = await client.send(command);
  return res;
}
