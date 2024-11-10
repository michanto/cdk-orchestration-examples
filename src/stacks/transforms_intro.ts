import { Log, Logger, LogLevel } from '@michanto/cdk-orchestration';
import { InlineNodejsFunction } from '@michanto/cdk-orchestration/aws-lambda-nodejs';
import { CustomResourceUtilities } from '@michanto/cdk-orchestration/custom-resources';
import { CfJsonType, Echo, Joiner, Transform } from '@michanto/cdk-orchestration/transforms';
import { Aws, Stack, StackProps } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { StateMachine, DefinitionBody } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { GreetingLambdaTask } from '../constructs/greeting_lambda_task';
import { HitlTestStepFunctionDefinition } from '../constructs/hitl_test_step_fn';

const LAMBDA_PATH = `${__dirname}/../../lib/constructs/lambdas/`;

/**
 * Echo is a Transform, and Transforms work out-of-the-box with L1 or L2 constructs.
 * Otherwise, the default is for a transform to be applied to the stack.
 *
 * Since we want this Transform to be applied to the custom resource in an L3 construct
 * (such as Task or AwsCustomResource), we need to override the target property to
 * return the correct L1 construct.
 */
export class CustomResourceEcho extends Echo {
  get target() {
    return new CustomResourceUtilities().findCustomResource(this.node.scope!);
  }
}

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
     * This will be called during synthesis when MyBuckets CfnBucket._toCloudFormation method is called,
     * before Stack transforms are called.
     */
    new Echo(bucket, 'BucketEcho');
    new Joiner(bucket);
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
    /**
     * This Echo transform will be called when Stack._toCloudFormation is called, after all the
     * CfnElements have been processed.
     *
     * Note this needs to be added last to reflect all other stack-level transforms.
     */
    new Echo(this, 'StackEcho');
    /**
     * Similar to CDK Triggers, LambdaTask classes are custom resources that call a lambda.
     */
    let task = new GreetingLambdaTask(this, 'GreetingLambdaTask', {
      greeting: 'Hello, everyone!',
    });
    new CustomResourceEcho(task, 'TaskEcho');
    const succeedStepFunction = new HitlTestStepFunctionDefinition(this, 'HitlStepFunction', {
      successMode: true,
    });
    let sm1 = new StateMachine(this, 'MockHitlStateMachine', {
      definitionBody: DefinitionBody.fromChainable(succeedStepFunction),
    });
    new Echo(sm1, 'Echo');
    new Joiner(sm1);
    new Echo(sm1, 'EchoAfterJoin');
    console.log('TransformsIntro constructor END');
  }
}