import { Log, Logger, LogLevel } from '@michanto/cdk-orchestration';
import { InlineNodejsFunction } from '@michanto/cdk-orchestration/aws-lambda-nodejs';
import { CfJsonType, Echo, Joiner, Transform } from '@michanto/cdk-orchestration/transforms';
import { Aws, Stack, StackProps } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

const LAMBDA_PATH = `${__dirname}/../../lib/constructs/lambdas/`;

/**
 * Transform that adds Environment variables to functions.
 *
 * Note that this could be done as an Aspect calling addEnvironment, albeit with a different
 * user experience.  For demo purposes.
 */
export class EnvironmentVariableAdder extends Transform {
  constructor(scope: Construct, id: string, readonly environment: Record<string, string>) {
    super(scope, id);
  }

  apply(template: CfJsonType): CfJsonType {
    let numberChanged = 0;
    for (let res in template.Resources) {
      if (template.Resources[res].Type == 'AWS::Lambda::Function') {
        template.Resources[res].Properties.Environment = {
          Variables: {
            ...template.Resources[res].Properties.Environment?.Variables || {},
            ...this.environment,
          },
        };
        numberChanged++;
      }
    }
    if (!numberChanged) {
      Log.of(this).error('No functions found.  No environment variables added.');
    }
    Log.of(this).debug(`Added environment variables to ${numberChanged} functions.`);
    return template;
  }
}

/**
 * Changes 'bucket' in the bucket name to 'vault'.
 */
export class BucketToVault extends Transform {
  constructor(scope: Construct, id: string = 'BucketToVault') {
    super(scope, id);
  }

  apply(template: CfJsonType): CfJsonType {
    for (let res in template.Resources) {
      if (template.Resources[res].Properties.BucketName) {
        template.Resources[res].Properties.BucketName.split('bucket').join('vault');
      }
    }
    return template;
  }
}

/**
 * TransformsIntro lesson.
 *
 * Introduces the concept of Transforms and how they work.
 */
export class TransformsIntro extends Stack {
  constructor(scope: Construct, id: string = 'TransformsInfo', props?:StackProps) {
    super(scope, id, props);
    console.log('TransformsIntro constructor BEGIN');
    Logger.set(this, new Logger({ logLevel: LogLevel.DEBUG }));

    let bucket = new Bucket(this, 'MyBucket', {
      bucketName: `my-bucket-${Aws.ACCOUNT_ID}-${Aws.REGION}`,
    });

    /**
     * This Echo transform will be called when Stack._toCloudFormation is called, after all the
     * CfnElements have been processed.
     *
     * Note this needs to be added last to reflect all other stack-level transforms.
     */
    new Echo(this, 'StackEcho');

    /**
     * This will be called during synthesis when MyBuckets CfnBucket._toCloudFormation method is called,
     * before Stack transforms are called.
     */
    new Echo(bucket, 'BucketEcho');
    new Joiner(bucket);
    new BucketToVault(bucket);
    new Echo(bucket, 'EchoAfterJoin');

    let functionOne = new InlineNodejsFunction(this, 'FunctionOne', {
      entry: `${LAMBDA_PATH}/echo.js`,
      environment: {
        HOBBIT: 'Nori',
      },
    });
    new InlineNodejsFunction(this, 'FunctionTwo', {
      entry: `${LAMBDA_PATH}/echo.js`,
      environment: {
        HOBBIT: 'Poppy',
      },
    });
    new InlineNodejsFunction(this, 'FunctionThree', {
      entry: `${LAMBDA_PATH}/echo.js`,
    });
    new EnvironmentVariableAdder(functionOne, 'F1SpecificVariables', {
      ELF: 'Arondir',
      MOUNTAIN: 'Thangorodrim',
      HOBBIT: 'Drogo',
    });
    new EnvironmentVariableAdder(this, 'GeneralVariables', {
      SPIDER: 'Ungoliant',
      MOUNTAIN: 'Taniquetil',
    });
  }
}


