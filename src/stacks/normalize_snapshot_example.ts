import { Echo } from '@michanto/cdk-orchestration/transforms';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnsureChangeInStack } from '../constructs/ensure_change_in_stack';
import { GreetingLambdaTask } from '../constructs/greeting_lambda_task';
import { NormalizeSnapshot } from '../constructs/normalize_snapshot';

export class NormalizeSnapshotExample extends Stack {
  constructor(scope: Construct, id: string = 'NormalizeSnapshotExample', props?: StackProps) {
    super(scope, id, props);
    EnsureChangeInStack.for(this);
    new GreetingLambdaTask(this, 'GreetingTaskLambda', {
      greeting: 'Hey come merry dol!',
    });

    new Echo(this, 'Unnormalized');
    new NormalizeSnapshot(this);
    new Echo(this, 'Normalized');
  }
}