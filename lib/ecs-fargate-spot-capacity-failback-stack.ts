import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';

export interface EcsFargateSpotCapacityFailbackStackProps extends StackProps {
  // Email address to receive email notifications about the Fargate Spot Capacity Unavailability events
  emailAddress: string;
}

export class EcsFargateSpotCapacityFailbackStack extends Stack {
  constructor(scope: Construct, id: string, props: EcsFargateSpotCapacityFailbackStackProps) {
    super(scope, id, props);

    // EventBridge Rule to trigger the handler.
    // More information on this documentation: https://aws.amazon.com/premiumsupport/knowledge-center/fargate-spot-termination-notice/
    const rule = new events.Rule(this, 'events-rule', {
      description: 'Listen to events where FARGATE_SPOT task cannot be placed due to the unavailability of Fargate Spot capacity',
      enabled: true,
      eventPattern: {
        source: [ 'aws.ecs' ],
        detailType: [ 'ECS Service Action' ],
        detail: {
          eventName: [
            'SERVICE_TASK_PLACEMENT_FAILURE'
          ],
          reason: [
            'RESOURCE:FARGATE'
          ]
        }
      }
    });

    // Dead letter queue for troubleshooting events that has been failed to be processed by the handler
    const lambdaDlq = new sqs.Queue(this, 'lambda-deadletter-queue');

    // Lambda function that will adjust the capacity weight of the ECS Service in case of events 
    const lambdaHandler = new lambda.Function(this, 'ecs-fargate-spot-capacity-failback-handler', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`exports.handler = handler.toString()`)
    });

    // Mapping the EventBridge rule to trigger the Lambda function
    rule.addTarget(new targets.LambdaFunction(lambdaHandler, {
      deadLetterQueue: lambdaDlq,
      maxEventAge: cdk.Duration.hours(2),
      retryAttempts: 5
    }));

    // SNS Topic and Subscription to receive email notification.
    const snsTopic = new sns.Topic(this, 'sns-topic', {
      displayName: 'SNS Topic about ECS Fargate Spot capacity unavailability events',
      topicName: 'fargate-spot-capacity-notification-topic'
    });
    snsTopic.addSubscription(new subscriptions.EmailSubscription(props.emailAddress, {
      json: true
    }));
    
    // Dead letter queue for troubleshooting events that has been failed to be processed by the SNS
    const snsDlq = new sqs.Queue(this, 'sns-deadletter-queue');

    // Mapping the EventBridge rule to be sent to SNS
    rule.addTarget(new targets.SnsTopic(snsTopic, {
      deadLetterQueue: snsDlq,
      maxEventAge: cdk.Duration.hours(2),
      retryAttempts: 5
    }));
  }
}
