import { aws_lambda_nodejs, custom_resources, orchestration, LoggingAspect } from '@michanto/cdk-orchestration';
import { Aspects, CustomResource } from 'aws-cdk-lib';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

const LAMBDA_PATH = `${__dirname}/../../lib/constructs/lambdas/`;

export interface GreetingLambdaTaskProps {
  readonly greeting: string;
}

export class GreetingLambdaTask extends custom_resources.Task {
  readonly handler: Function;
  readonly task: orchestration.LambdaTask;
  readonly customResource: CustomResource;

  constructor(scope: Construct, id: string, props: GreetingLambdaTaskProps) {
    super(scope, id);
    this.handler = new aws_lambda_nodejs.InlineNodejsFunction(this, 'Reverse', {
      entry: `${LAMBDA_PATH}reverse_greeting.js`,
      handler: 'reverseGreeting',
    });

    this.task = new orchestration.LambdaTask(this, 'LambdaTask', {
      lambdaFunction: this.handler,
      payload: JSON.stringify({
        Greeting: props.greeting,
      }),
    });
    this.customResource = this.task.customResource;

    Aspects.of(this).add(new LoggingAspect());
  }
}
