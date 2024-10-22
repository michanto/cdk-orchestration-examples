import { Log, Logger, LogLevel, Singleton } from '@michanto/cdk-orchestration';
import { InlineNodejsFunction } from '@michanto/cdk-orchestration/aws-lambda-nodejs';
import { App, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
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

export class SingletonLesson extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    let app = this.node.root as App;
    Logger.set(app, new Logger({ logLevel: LogLevel.INFO }));
    let log = Log.of(this);

    let parent = new Construct(this, 'AParent');
    let fn = Singleton.create(parent, 'Function', (s, sid) => new EchoFunction(s, sid)) as EchoFunction;
    log.info(fn.node.path);
  }
}