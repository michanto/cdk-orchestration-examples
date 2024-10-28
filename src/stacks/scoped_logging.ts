import {
  IStringProvider,
  Log, Logger, LoggingAspect, LogLevel,
  NoOpLogger,
  PostResolveToken,
} from '@michanto/cdk-orchestration';
import {
  InlineNodejsFunction,
} from '@michanto/cdk-orchestration/aws-lambda-nodejs';
import { Aspects, CfnElement, Lazy, Stack, StackProps } from 'aws-cdk-lib';
import { CfnBucket, CfnBucketProps } from 'aws-cdk-lib/aws-s3';
import { Construct, IConstruct } from 'constructs';

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
    testLogging(this, () => 'Constructor called.');
  }
}

/**
 * Demonstrates scoped logging from the constructor, _toCloudFormation,
 * and token resolution.
 *
 * Note _toCloudFormation is called during synthesis.
 */
export class DescriptionCfnElement extends CfnElement {
  constructor(scope: Construct, id: string, readonly description: string) {
    super(scope, id);
    Log.of(this).info('Constructor called.');
  }

  _toCloudFormation(): object {
    Log.of(this).info('_toCloudFormation called.');
    let result = {
      Description: Lazy.string({
        produce: () => {
          Log.of(this).info('Description resolved.');
          return this.description;
        },
      }, { displayHint: 'Description' }),
    };
    Log.of(this).info(`_toCloudFormation result ${JSON.stringify(result, undefined, 1)}`);
    return result;
  }
}

/**
 * Logs in constructor and during synthesis.
 */
export class LoggingCfnBucket extends CfnBucket {
  constructor(scope: Construct, id: string, props?: CfnBucketProps) {
    super(scope, id, props);
    Log.of(this).info('Constructor called.');
  }

  protected renderProperties(props: Record<string, any>): Record<string, any> {
    Log.of(this).info(`renderProperties called with props ${
      JSON.stringify(props, undefined, 1)
    }.`);
    let result = super.renderProperties(props);
    Log.of(this).info(`renderProperties result ${JSON.stringify(result, undefined, 1)}`);
    return result;
  }

  _toCloudFormation(): object {
    let log = Log.of(this);
    log.info('_toCloudFormation called.');
    let result = super._toCloudFormation();
    log.info(`_toCloudFormation result: ${JSON.stringify(result, undefined, 1)}`);

    let prt = new PostResolveToken(result, {
      process: (template, context) => {
        Log.of(context.scope).info(`PostResolveToken.process: ${
          JSON.stringify({
            preparing: context.preparing,
            documentPath: context.documentPath,
          }, undefined, 1)
        }: ${JSON.stringify(template, undefined, 1)}`);
        return template;
      },
    });
    Log.of(this).info(`_toCloudFormation PostResolveToken: ${prt}`);
    return prt;
  }
}

/**
 * Scoped Logging lesson.
 */
export class ScopedLogging extends Stack {
  public readonly bucket: CfnBucket;

  constructor(scope: Construct, id: string = 'ScopedLogging', props?: StackProps) {
    super(scope, id, props);

    // This will add LogLevel environment varible to all Functions.
    Aspects.of(this).add(new class extends LoggingAspect {
      visit(node: IConstruct): void {
        Log.of(node).info('visiting');
        super.visit(node);
      }
    }());

    // NOTE:  Below console.log lines are meant as comments in the output.
    // Calls to Log.of indicate lesson code.
    /**
     * Mark the beginning and end of the constructor to
     * make it easier to find in the build output.
     */
    console.log('---Scoped Logging---');

    console.log('Before logging has been turned on for stack.');
    // These are the same methods on the console object.
    testLogging(this, 'Hello!');
    new NoisyConstruct(this, 'AcutallyQuiet');

    Logger.set(this, new Logger({
      logLevel: LogLevel.ALL,
    }));

    console.log('');
    console.log('After logging has been turned on for stack.');

    /**
     * Write stack-scoped log lines.
     */
    testLogging(this, 'Hello again!');
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


    /**
     * Motice the difference between the LogLevel environmnet variable
     * in the stack template.json entry for\ each of these Lambdas.
     */
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

    new DescriptionCfnElement(this, 'DescriptionCfnElement', 'Stack description');

    this.bucket = new LoggingCfnBucket(this, 'LoggingCfnBucket', {
      bucketName: Lazy.string({
        produce: () => {
          Log.of(this.bucket).info('Resolving bucket name.');
          return `my-bucket-${this.account}-${this.region}`;
        },
      }),
    });

    console.log('---Scoped Logging END---');
  }
}
