import { Logger } from '@michanto/cdk-orchestration';
import { InlineNodejsFunction } from '@michanto/cdk-orchestration/aws-lambda-nodejs';
import { Chainable, InsertStepFunctionState } from '@michanto/cdk-orchestration/aws-stepfunctions';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Grant, IGrantable } from 'aws-cdk-lib/aws-iam';
import {
  Chain,
  Choice,
  Condition,
  DefinitionBody,
  Fail,
  IChainable,
  JsonPath,
  Pass,
  Result,
  StateMachine,
  Succeed,
} from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';

const LAMBDA_PATH = `${__dirname}/../../lib/constructs/lambdas/`;

let failResult = {
  s3Uri: 's3://hitl-test-runs/runs/hitl-host-01/2024-05-10T10:38:27Z/0caefbbe-0eb5-11ef-abd9-c25c5bb7c74f',
  allRunsComplete: true,
  allRunsSuccessful: false,
};

let succeedResult = {
  s3Uri: 's3://hitl-test-runs/runs/hitl-host-02/2024-05-10T10:38:27Z/15a85c7d-d7ca-43b4-906a-818488f39177',
  allRunsComplete: true,
  allRunsSuccessful: true,
};

export interface HitlTestStepFunctionProps {
  readonly successMode: boolean;
}

/**
 * Chainable is the abstract base class for creating state machine definitions.
 */
export class HitlTestStepFunctionDefinition extends Chainable {
  readonly wrapped: IChainable;

  constructor(scope: Construct, id: string, props: HitlTestStepFunctionProps) {
    super(scope, id);
    const event = props.successMode ? succeedResult : failResult;
    const initialStep = new Pass(this, 'HitlSetup', {
      result: Result.fromObject(event),
    });

    const echoLambda = new InlineNodejsFunction(this, 'EchoLambda', {
      entry: `${LAMBDA_PATH}/echo.js`,
      environment: {
        LogLevel: '1',
      },
    });

    const echoStep = new LambdaInvoke(this, 'RunHitl', {
      lambdaFunction: echoLambda,
      payloadResponseOnly: true,
    });
    initialStep.next(echoStep);

    let areRunsSuccessful = new Choice(this, 'AreRunsSuccessful?', {
    });
    areRunsSuccessful.when(Condition.and(
      Condition.booleanEquals('$.allRunsComplete', true),
      Condition.booleanEquals('$.allRunsSuccessful', true),
    ), new Succeed(this, 'SucceedStep', {
      comment: 'All runs complete and successful',
    }));
    areRunsSuccessful.otherwise(new Fail(this, 'FailStep', {
      comment: 'Some test failed or was incomplete.',
      causePath: JsonPath.jsonToString(JsonPath.objectAt('$')),
    }));
    echoStep.next(areRunsSuccessful);

    this.wrapped = Chain.start(initialStep);
  }
}


export class CreateConsoleLink extends Construct {
  readonly consoleLinkStep: LambdaInvoke;
  readonly s3UrlLambda: InlineNodejsFunction;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.s3UrlLambda = new InlineNodejsFunction(this, 'S3UrlLambda', {
      entry: `${LAMBDA_PATH}/console_link.js`,
      handler: 'index.s3UriToConsoleUri',
      environment: {
        LogLevel: '1',
      },
    });

    this.consoleLinkStep = new LambdaInvoke(this, 'DeepLinkStep', {
      lambdaFunction: this.s3UrlLambda,
      payloadResponseOnly: true,
      resultPath: '$.DeepLink',
      resultSelector: {
        'DeepLink.$': '$.deepLink',
      },
    });
  }

  grantInvoke(grantee: IGrantable): Grant {
    return this.s3UrlLambda.grantInvoke(grantee);
  }
}

export class PropertyTransforms extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    Logger.set(this, new Logger());

    const succeedStepFunction = new HitlTestStepFunctionDefinition(this, 'HitlStepFunctionDefinition', {
      successMode: true,
    });
    let sm1 = new StateMachine(this, 'HitlStateMachine', {
      definitionBody: DefinitionBody.fromChainable(succeedStepFunction),
    });

    let consoleLink = new CreateConsoleLink(this, 'CreateDeepLink');
    new InsertStepFunctionState(sm1, 'InsertDeepLink', {
      state: consoleLink.consoleLinkStep,
      insertAfterStep: 'RunHitl',
    });

    consoleLink.grantInvoke(sm1);
  }
}