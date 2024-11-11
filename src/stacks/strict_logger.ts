import { IStringProvider, Log, Logger, LogLevel } from '@michanto/cdk-orchestration';
import { Annotations, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * For this example, any construct that logs an warn line will do.
 */
export class WarningConstruct extends Construct {
  constructor(scope: Construct, id: string = 'WarningConstruct') {
    super(scope, id);
    Log.of(this).warn("This construct doesn't do anything.  Why did you make it?");
  }
}

/**
 * For this example, any construct that logs an error line will do.
 */
export class ErrorConstruct extends Construct {
  constructor(scope: Construct, id: string = 'ErrorConstruct') {
    super(scope, id);
    Log.of(this).error("This construct doesn't do anything.  Why did you make it?");
  }
}

/**
 * This logger turns all Error and Warning log messages, even if they are not printed,
 * into Error and Warning Annotations.
 *
 * Error annotations will fail a build, and warning annotations will fail a build
 * when built with the strict flag.
 */
export class StrictLogger extends Logger {
  log(scope: Construct, logLevel: number, message: string | IStringProvider): void {
    super.log(scope, logLevel, message);
    if (logLevel == LogLevel.ERROR) {
      if (typeof message == 'function') {
        message = message();
      }
      Annotations.of(scope).addError(message);
    }

    if (logLevel == LogLevel.WARNING) {
      if (typeof message == 'function') {
        message = message();
      }
      Annotations.of(scope).addWarning(message);
    }
  }
}

export class StrictLoggerExample extends Stack {
  constructor(scope: Construct, id: string = 'StrictLoggerExample', props?: StackProps) {
    super(scope, id, props);
    Logger.set(this, new StrictLogger({ logLevel: LogLevel.OFF }));
    new ErrorConstruct(this);
    new WarningConstruct(this);
  }
}