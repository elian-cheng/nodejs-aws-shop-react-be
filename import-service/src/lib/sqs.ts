import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { randomUUID } from 'crypto';
import { REGION } from '../utils/constants';

const client = new SQSClient({
  region: REGION,
});

export async function sendSQSMessage(
  queueUrl: string,
  message: any,
  groupId?: string,
  deduplicationId?: string
) {
  const payload = {
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(message),
    MessageGroupId: groupId || 'products',
    MessageDeduplicationId: deduplicationId || randomUUID(),
  };
  const command = new SendMessageCommand(payload);
  await client.send(command);
  return true;
}
