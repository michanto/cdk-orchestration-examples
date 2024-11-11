import { Log, Logger, LogLevel, Singleton } from '@michanto/cdk-orchestration';
import { InlineNodejsFunction } from '@michanto/cdk-orchestration/aws-lambda-nodejs';
import { App, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnsureChangeInStack } from '../constructs/ensure_change_in_stack';
const LAMBDA_PATH = `${__dirname}/../../lib/constructs/lambdas/`;

export class EchoFunction extends InlineNodejsFunction {
  constructor(scope: Construct, id: string) {
    super(scope, id, {
      entry: `${LAMBDA_PATH}/echo.js`,
      environment: {
        LogLevel: '1',
      },
    });
  }
}

export class SingletonExample extends Stack {
  constructor(scope: Construct, id: string = 'SingletonExample', props?: StackProps) {
    super(scope, id, props);
    let app = this.node.root as App;
    Logger.set(app, new Logger({ logLevel: LogLevel.INFO }));
    let log = Log.of(this);

    let parent = new Construct(this, 'AParent');
    let fn = Singleton.create(parent, 'SingletonFunction', (s, sid) => new EchoFunction(s, sid)) as EchoFunction;
    // EnsureChangeInStack creates a singleton.
    EnsureChangeInStack.for(this);
    log.info(fn.node.path);
  }
}