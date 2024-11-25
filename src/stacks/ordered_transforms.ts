import { Logger, LogLevel } from '@michanto/cdk-orchestration';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ImportEchoInputStepFunction } from '../constructs/py_step_functions_cleanup';

export class OrderedTransforms extends Stack {
  constructor(scope: Construct, id: string = 'OrderedTransforms', props?: StackProps) {
    super(scope, id, props);
    console.log('OrderedTransforms constructor BEGIN');
    Logger.set(this, new Logger({ logLevel: LogLevel.DEBUG }));

    /** Import existing template into the CDK. */
    new ImportEchoInputStepFunction(this, 'ImportEchoInput');
    console.log('OrderedTransforms constructor END');
  }
}
