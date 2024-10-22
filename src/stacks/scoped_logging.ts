import {
  ConstructTreeSearch,
  Log, Logger, LoggingAspect, LogLevel,
  NoOpLogger,
} from '@michanto/cdk-orchestration';
import {
  InlineNodejsFunction,
} from '@michanto/cdk-orchestration/aws-lambda-nodejs';
import { Aspects, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

const LAMBDA_PATH = `${__dirname}/../../lib/constructs/lambdas/`;

/** This construct exists to demonstrate scoped logging. */
export class NoisyConstruct extends Construct {
  constructor(scope: Construct, id: string = 'NoisyConstruct') {
    super(scope, id);
    const log = Log.of(this);
    log.info(`Creating NoisyConstruct at ${this.node.path}`);
    log.debug(`Parent ${this.node.scope?.node.path} of NoisyConstruct ${
      this.node.path
    } has ${
      ConstructTreeSearch.for(Construct.isConstruct).searchDown(this.node.scope!).length
    } descendents.`);
    log.error(`Error from ${this.node.path}!`);
    log.warn(`Warning from ${this.node.path}!`);
  }
}

/**
 * Scoped Logging lesson.
 */
export class ScopedLogging extends Stack {
  constructor(scope: Construct, id: string = 'ScopedLogging', props?: StackProps) {
    super(scope, id, props);

    // This will add LogLevel varible to all Functions.
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
    Log.of(this).error('Hello from Stack!');
    Log.of(this).warn('Hello from Stack!');
    Log.of(this).info('Hello from Stack!');
    Log.of(this).debug('Hello from Stack!');
    new NoisyConstruct(this, 'AcutallyQuiet');

    Logger.set(this, new Logger({
      logLevel: LogLevel.ALL,
    }));

    console.log('');
    console.log('After logging has been turned on for stack.');

    /**
     * Write stack-scoped log lines.
     */
    Log.of(this).error('Hello from Stack!');
    Log.of(this).warn('Hello from Stack!');
    Log.of(this).info('Hello from Stack!');
    Log.of(this).debug('Hello from Stack!');
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
    Log.of(subScope).error('Hello from SubScope!');
    Log.of(subScope).warn('Hello from SubScope!');
    Log.of(subScope).info('Hello from SubScope!');
    Log.of(subScope).debug('Hello from SubScope!');
    console.log('Noisy construct with INFO logging turned on.');
    new NoisyConstruct(subScope);

    let subSubScope = new Construct(subScope, 'DebugScope');
    Logger.set(subSubScope, new Logger({
      logLevel: LogLevel.DEBUG,
    }));
    console.log('');
    console.log('Noisy construct with DEBUG logging turned on.');
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

    console.log('---Scoped Logging END---');
  }
}
