import { Log, Logger } from '@michanto/cdk-orchestration';
import { CfTemplateType, Transform } from '@michanto/cdk-orchestration/transforms';
import { App, Stack, StackProps } from 'aws-cdk-lib';
import { DefinitionBody, StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { GreetingLambdaTask } from './constructs/greeting_lambda_task';
import { HitlTestStepFunctionDefinition } from './constructs/hitl_test_step_fn';
import { PyStepFunctionsImport } from './constructs/py_step_functions_cleanup';

// TODO:  Just use Echo.
export class EchoResource extends Transform {
  constructor(scope: Construct, id: string, readonly logicalId: string) {
    super(scope, id);
    Logger.set(this, new Logger());
  }

  get shimParent(): Construct {
    return Stack.of(this);
  }

  apply(template: CfTemplateType): CfTemplateType {
    let logicalId = Stack.of(this).resolve(this.logicalId);
    let res = template.Resources[logicalId];
    if (res) {
      Log.of(this).info(`'${logicalId}':` + JSON.stringify(res, undefined, 2));
    }
    return template;
  }
}

export class FindingConstructs01 extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const succeedStepFunction = new HitlTestStepFunctionDefinition(this, 'HitlStepFunction', {
      successMode: true,
    });
    new StateMachine(this, 'MockHitlStateMachine', {
      definitionBody: DefinitionBody.fromChainable(succeedStepFunction),
    });
    new GreetingLambdaTask(this, 'GreetingLambdaTask', {
      greeting: 'Hello, everyone!',
    });

    new PyStepFunctionsImport(this, 'PyStepFunctionsImport');

    /* * /
    let resources = new CfnElementUtilities().cfnResources(this);
    console.log(`${resources.length} resources.`);
    console.log(resources.map(x => `${x.node.path} (${x.cfnResourceType})`));

    /* * /
    let lambdaTask = resources.filter(x => x.cfnResourceType == 'Custom::LambdaTask').pop()!;
    // TODO: Use Echo.
    new EchoResource(lambdaTask, 'Echo', lambdaTask.logicalId);
    /**/
    /** /
    new RemoveSalt(lambdaTask);
    /**/
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new FindingConstructs01(app, 'cdk-orch-finding-constructs-dev', { env: devEnv });
// new FindingConstructs01(app, 'cdk-orch-finding-constructs-prod', { env: prodEnv });

app.synth();