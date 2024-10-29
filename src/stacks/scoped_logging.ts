import {
  IStringProvider,
  Log, Logger, LoggingAspect, LogLevel,
  NoOpLogger,
  PostResolveToken,
  TreeInspectable,
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
export class StackDescription extends CfnElement {
  constructor(scope: Construct, id: string, readonly description: string) {
    super(scope, id);
    Log.of(this).info(`Constructor called with description '${description}'.`);
  }

  _toCloudFormation(): object {
    Log.of(this).info('_toCloudFormation called.');
    let result = {
      Description: Lazy.string({
        produce: () => {
          Log.of(this).info(`Description resolved to '${this.description}'.`);
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
    Log.of(this).info(`Constructor called with props: ${
      props ? JSON.stringify(props, undefined, 1) : 'undefined'
    }.`);
  }

  protected renderProperties(props: Record<string, any>): Record<string, any> {
    Log.of(this).info(`renderProperties called with props: ${
      JSON.stringify(props, undefined, 1)
    }.`);
    let result = super.renderProperties(props);
    Log.of(this).info(`renderProperties result: ${JSON.stringify(result, undefined, 1)}`);
    return result;
  }

  _toCloudFormation(): object {
    let log = Log.of(this);
    log.info('_toCloudFormation called.');
    let result = super._toCloudFormation();
    log.info(`_toCloudFormation result: ${JSON.stringify(result, undefined, 1)}`);

    let postResolveToken = new PostResolveToken(result, {
      process: (template, context) => {
        Log.of(context.scope).info(`PostResolveToken.process context = ${
          JSON.stringify({
            preparing: context.preparing,
            documentPath: context.documentPath,
          }, undefined, 1)
        }\n  template = ${JSON.stringify(template, undefined, 1)}`);
        return template;
      },
    });
    Log.of(this).info(`_toCloudFormation PostResolveToken: ${postResolveToken}`);
    return postResolveToken;
  }
}

/**
 * LoggingAspect adds a 'LogLevel' environment varible to all Functions that matches
 * the LogLevel for the construct.  It is omitted if the LogLevel is OFF (0).
 *
 * Additionally, this version logs to the console and adds to tree.json.
 */
export class LoggingAspectThatLogs extends LoggingAspect {
  visit(node: IConstruct): void {
    let logLevel = Logger.of(node).logLevel;
    Log.of(node).info(`visiting node with LogLevel = ${logLevel}`);
    TreeInspectable.of(node).addAttribute('Logger.of(node).logLevel', logLevel);
    super.visit(node);
  }
}

/**
 * Scoped Logging lesson.
 */
export class ScopedLogging extends Stack {
  public readonly bucket: CfnBucket;

  constructor(scope: Construct, id: string = 'ScopedLogging', props?: StackProps) {
    super(scope, id, props);

    console.log('//-- **** ScopedLogging constructor BEGIN ****');

    Aspects.of(this).add(new LoggingAspectThatLogs());


    console.log('//-- Before logging has been turned on for stack.');
    /**
     * Write stack-scoped log lines.
     */
    testLogging(this, 'Hello!');
    new NoisyConstruct(this, 'ActuallyQuiet');

    console.log('//-- Set stack logging level to ALL and re-run test.');
    Logger.set(this, new Logger({
      logLevel: LogLevel.ALL,
    }));

    /**
     * Write stack-scoped log lines.
     */
    testLogging(this, 'Hello again!');
    new NoisyConstruct(this);
    console.log('');

    /**
     * Create sub-scopes with differnt logging and add NoistyConstruct to them.
     *
     * Note that the sub-scopes are all nested, which makes for long LogicalIDs for the
     * Lambda functions we are going to add.
     */
    let infoScope = new Construct(this, 'InfoScope');
    Logger.set(infoScope, new Logger({
      logLevel: LogLevel.INFO,
    }));
    // Write SubScope log lines.
    testLogging(infoScope, 'Hello friend!');
    new NoisyConstruct(infoScope);

    let errorScope = new Construct(infoScope, 'ErrorScope');
    Logger.set(errorScope, new Logger({
      logLevel: LogLevel.ERROR,
    }));
    new NoisyConstruct(errorScope);

    let noLogScope = new Construct(errorScope, 'NoLogScope');
    Logger.set(noLogScope, new NoOpLogger());
    new NoisyConstruct(noLogScope);

    /**
     * Motice the difference between the LogLevel environmnet variable
     * in the stack template.json entry for each of these Lambdas.
     *
     * Also note that the LogicalIds quickly get confusing to read.
     * The CloudFormation produced by the CDK is barely readable sometimes.
     */
    new InlineNodejsFunction(this, 'EchoLambda', {
      entry: `${LAMBDA_PATH}/echo.js`,
    });

    new InlineNodejsFunction(infoScope, 'EchoLambda', {
      entry: `${LAMBDA_PATH}/echo.js`,
    });

    new InlineNodejsFunction(errorScope, 'EchoLambda', {
      entry: `${LAMBDA_PATH}/echo.js`,
    });

    new InlineNodejsFunction(noLogScope, 'EchoLambda', {
      entry: `${LAMBDA_PATH}/echo.js`,
    });

    new StackDescription(this, 'StackDescription', 'The road goes ever on and on.');

    this.bucket = new LoggingCfnBucket(this, 'LoggingCfnBucket', {
      bucketName: Lazy.string({
        produce: () => {
          Log.of(this.bucket).info('Resolving bucketName.');
          return `my-bucket-${this.account}-${this.region}`;
        },
      }, { displayHint: 'BucketName' }),
    });

    console.log('//-- **** ScopedLogging constructor END ****');
  }
}
