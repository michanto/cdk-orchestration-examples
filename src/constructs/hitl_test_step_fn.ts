import { aws_lambda_nodejs, transforms, aws_stepfunctions } from '@michanto/cdk-orchestration';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Grant, IGrantable } from 'aws-cdk-lib/aws-iam';
import {
  Chain,
  Choice,
  Condition,
  DefinitionBody,
  Fail,
  IChainable,
  INextable,
  JsonPath,
  Pass,
  Result,
  State,
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

export class HitlTestStepFunctionDefinition extends Construct implements IChainable {
  readonly chainable: IChainable;

  constructor(scope: Construct, id: string, props: HitlTestStepFunctionProps) {
    super(scope, id);
    const event = props.successMode ? succeedResult : failResult;
    const initialStep = new Pass(this, 'AreRunsComplete?', {
      result: Result.fromObject(event),
    });

    const echoLambda = new aws_lambda_nodejs.InlineNodejsFunction(this, 'EchoLambda', {
      entry: `${LAMBDA_PATH}/echo.js`,
      environment: {
        LogLevel: '1',
      },
    });

    const echoStep = new LambdaInvoke(this, 'EchoStep', {
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
      comment: 'All runs complete but not successful',
      causePath: JsonPath.jsonToString(JsonPath.objectAt('$')),
    }));
    echoStep.next(areRunsSuccessful);

    this.chainable = Chain.start(initialStep);
  }

  get id(): string {
    return this.chainable.id;
  }

  get startState(): State {
    return this.chainable.startState;
  };

  get endStates(): INextable[] {
    return this.chainable.endStates;
  };
}


export class CreateConsoleLink extends Construct {
  readonly consoleLinkStep: LambdaInvoke;
  readonly s3UrlLambda: aws_lambda_nodejs.InlineNodejsFunction;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.s3UrlLambda = new aws_lambda_nodejs.InlineNodejsFunction(this, 'S3UrlLambda', {
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

/** NOTE:  USED IN INTEGRATION TEST!  CHANGE CAREFULLY. */
export class HitlTestStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const succeedStepFunction = new HitlTestStepFunctionDefinition(this, 'HitlStepFunction', {
      successMode: true,
    });
    const failedStepFunction = new HitlTestStepFunctionDefinition(this, 'FailedHitlStepFunction', {
      successMode: false,
    });
    let sm1 = new StateMachine(this, 'MockHitlStateMachine', {
      definitionBody: DefinitionBody.fromChainable(succeedStepFunction),
    });

    let consoleLink = new CreateConsoleLink(this, 'CreateDeepLink');
    new aws_stepfunctions.InsertStepFunctionState(sm1, 'NewStep', {
      state: consoleLink.consoleLinkStep,
      insertAfterStep: 'AreRunsComplete?',
    });

    let sm2 = new StateMachine(this, 'MockFailHitlStateMachine', {
      definitionBody: DefinitionBody.fromChainable(failedStepFunction),
    });
    new aws_stepfunctions.InsertStepFunctionState(sm2, 'NewStep', {
      state: consoleLink.consoleLinkStep,
      insertAfterStep: 'AreRunsComplete?',
    });

    consoleLink.grantInvoke(sm1);
    consoleLink.grantInvoke(sm2);

    new transforms.Joiner(this);
  }
}