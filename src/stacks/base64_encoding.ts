import { Logger, LogLevel } from '@michanto/cdk-orchestration';
import { CustomResourceUtilities } from '@michanto/cdk-orchestration/custom-resources';
import { Echo, ImportOrders } from '@michanto/cdk-orchestration/transforms';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { GreetingLambdaTask } from '../constructs/greeting_lambda_task';

/**
 * Echo is a Transform, and Transforms work out-of-the-box with L1 or L2 constructs.
 * Otherwise, the default is for a transform to be applied to the stack.
 *
 * Since we want this Transform to be applied to the custom resource in an L3 construct
 * (such as Task or AwsCustomResource), we need to override the target property to
 * return the correct L1 construct.
 */
export class EchoCustomResource extends Echo {
  get target() {
    return new CustomResourceUtilities().findCustomResource(this.node.scope!);
  }
}

export class EchoCustomResourceAfterEncode extends EchoCustomResource {
  get order() {
    // Encode runs in WRITER order.
    return ImportOrders.WRITER;
  }
}

export class Base64EncodingExample extends Stack {
  constructor(scope: Construct, id: string = 'TransformsInfo', props?: StackProps) {
    super(scope, id, props);
    console.log('OrderedTransforms constructor BEGIN');
    Logger.set(this, new Logger({ logLevel: LogLevel.DEBUG }));

    /**
     * Similar to CDK Triggers, LambdaTask classes are custom resources that call a lambda.
     */
    let task = new GreetingLambdaTask(this, 'GreetingLambdaTask', {
      greeting: 'Hello, everyone!',
    });
    new EchoCustomResource(task, 'EchoCustomResource');
    new EchoCustomResourceAfterEncode(task, 'EchoCustomResourceAfterEncode');

    console.log('OrderedTransforms constructor END');
  }
}
