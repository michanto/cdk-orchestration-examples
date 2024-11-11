import { StackProvenanceAspect } from '@michanto/cdk-orchestration';
import { Aspects, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnsureChangeInStack } from '../constructs/ensure_change_in_stack';

export class StackProvenanceExample extends Stack {
  constructor(scope: Construct, id: string = 'StackProvenance', props?: StackProps) {
    super(scope, id, props);

    Aspects.of(this).add(new StackProvenanceAspect());
    EnsureChangeInStack.for(this);
  }
}