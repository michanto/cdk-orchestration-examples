import { LoggingAspect } from '@michanto/cdk-orchestration';
import { InlineNodejsFunction } from '@michanto/cdk-orchestration/aws-lambda-nodejs';
import { Task } from '@michanto/cdk-orchestration/custom-resources';
import { LambdaTask } from '@michanto/cdk-orchestration/orchestration';
import { Aspects, CustomResource } from 'aws-cdk-lib';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

const LAMBDA_PATH = `${__dirname}/../../lib/constructs/lambdas/`;

export interface GreetingLambdaTaskProps {
  readonly greeting: string;
}

export class GreetingLambdaTask extends Task {
  readonly handler: Function;
  readonly task: LambdaTask;
  readonly customResource: CustomResource;

  constructor(scope: Construct, id: string, props: GreetingLambdaTaskProps) {
    super(scope, id);
    this.handler = new InlineNodejsFunction(this, 'Reverse', {
      entry: `${LAMBDA_PATH}reverse_greeting.js`,
      handler: 'reverseGreeting',
    });

    this.task = new LambdaTask(this, 'LambdaTask', {
      lambdaFunction: this.handler,
      payload: JSON.stringify({
        Greeting: props.greeting,
      }),
    });
    this.customResource = this.task.customResource;

    Aspects.of(this).add(new LoggingAspect());
  }
}
