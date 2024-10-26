import {
  IStringProvider,
  Log, Logger, LoggingAspect, LogLevel,
  NoOpLogger,
  PostResolveToken,
} from '@michanto/cdk-orchestration';
import {
  InlineNodejsFunction,
} from '@michanto/cdk-orchestration/aws-lambda-nodejs';
import { Aspects, CfnElement, Stack, StackProps } from 'aws-cdk-lib';
import { CfnBucket, CfnBucketProps } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

const LAMBDA_PATH = `${__dirname}/../../lib/constructs/lambdas/`;

export function testLogging(scope: Construct, msg: string | IStringProvider) {
  const log = Log.of(scope);

  // These are the same methods on the console object.
  log.error(msg);
  log.warn(msg);
  log.info(msg);
  log.debug(msg);
}

/**
 * Demonstrate scoped logging from constructor.
 */
export class NoisyConstruct extends Construct {
  constructor(scope: Construct, id: string = 'NoisyConstruct') {
    super(scope, id);
    testLogging(this, () => 'Hello from NoisyConstruct.');
  }
}

/**
 * Demonstrate scoped logging from constructor.
 */
export class LoggingCfnElement extends CfnElement {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    Log.of(this).info('Constructor from LoggingCfnElement');
  }

  _toCloudFormation(): object {
    Log.of(this).info('_toCloudFormation from LoggingCfnElement');
    return {};
  }
}

export class LoggingCfnBucket extends CfnBucket {
  constructor(scope: Construct, id: string, props?: CfnBucketProps) {
    super(scope, id, props);
    Log.of(this).info('Constructor from LoggingCfnBucket');
  }

  _toCloudFormation(): object {
    let result = super._toCloudFormation();
    Log.of(this).info(`LoggingCfnBucket result ${JSON.stringify(result)}`);

    return new PostResolveToken(result, {
      process: (template, context) => {
        if (context.preparing) {
          Log.of(this).info(`LoggingCfnBucket preparing ${JSON.stringify(template)}`);
          return template;
        } else {
          Log.of(this).info(`LoggingCfnBucket output ${JSON.stringify(template)}`);
          return template;
        }
      },
    });
  }
}

/**
 * Scoped Logging lesson.
 */
export class ScopedLogging extends Stack {
  constructor(scope: Construct, id: string = 'ScopedLogging', props?: StackProps) {
    super(scope, id, props);

    // This will add LogLevel environment varible to all Functions.
    Aspects.of(this).add(new LoggingAspect());

    // NOTE:  Below console.log lines are meant as comments in the output.
    // Calls to Log.of indicate lesson code.
    /**
     * Mark the beginning and end of the constructor to
     * make it easier to find in the build output.
     */
    console.log('---Scoped Logging---');

    console.log('Before logging has been turned on for stack.');
    // These are the same methods on the console object.
    testLogging(this, 'Hello from Stack!');
    new NoisyConstruct(this, 'AcutallyQuiet');

    Logger.set(this, new Logger({
      logLevel: LogLevel.ALL,
    }));

    console.log('');
    console.log('After logging has been turned on for stack.');

    /**
     * Write stack-scoped log lines.
     */
    testLogging(this, 'Hello again from Stack!');
    console.log('');
    console.log('Noisy construct with ALL logging turned on.');
    new NoisyConstruct(this);
    console.log('');

    /**
     * Create a sub-scope
     */
    let subScope = new Construct(this, 'InfoScope');
    Logger.set(subScope, new Logger({
      logLevel: LogLevel.INFO,
    }));
    // Write SubScope log lines.
    testLogging(subScope, 'Hello from SubScope!');
    console.log('Noisy construct with INFO logging turned on.');
    new NoisyConstruct(subScope);

    let subSubScope = new Construct(subScope, 'ErrorScope');
    Logger.set(subSubScope, new Logger({
      logLevel: LogLevel.ERROR,
    }));
    console.log('');
    console.log('Noisy construct with ERROR logging turned on.');
    new NoisyConstruct(subSubScope);

    let subSubSubScope = new Construct(subSubScope, 'NoLoggingScope');
    Logger.set(subSubSubScope, new NoOpLogger());
    console.log('');
    console.log('Noisy construct with NoOpLogger.');
    new NoisyConstruct(subSubSubScope);

    new InlineNodejsFunction(this, 'EchoLambda', {
      entry: `${LAMBDA_PATH}/echo.js`,
    });

    new InlineNodejsFunction(subScope, 'EchoLambdaSubScope', {
      entry: `${LAMBDA_PATH}/echo.js`,
    });

    new InlineNodejsFunction(subSubScope, 'EchoLambdaSubSubScope', {
      entry: `${LAMBDA_PATH}/echo.js`,
    });

    new InlineNodejsFunction(subSubSubScope, 'EchoLambdaSubSubSubScope', {
      entry: `${LAMBDA_PATH}/echo.js`,
    });

    console.log('');
    console.log('A final noisty construct with ALL logging.');
    new NoisyConstruct(this, 'AnotherNoisyConstruct');

    new LoggingCfnElement(this, 'LoggingCfnElement');
    new LoggingCfnBucket(this, 'LoggingCfnBucket');

    console.log('---Scoped Logging END---');
  }
}
