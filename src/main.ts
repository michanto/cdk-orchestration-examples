import { CfnElementUtilities, Logger, transforms } from '@michanto/cdk-orchestration';
import { App, Stack, StackProps } from 'aws-cdk-lib';
import { DefinitionBody, StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { GreetingLambdaTask } from './constructs/greeting_lambda_task';
import { HitlTestStepFunctionDefinition } from './constructs/hitl_test_step_fn';
import { PyStepFunctionsImport } from './constructs/py_step_functions_cleanup';

export class EchoResolved extends transforms.Transform {
  constructor(scope: Construct, id: string, readonly resourceId: string) {
    super(scope, id);
  }

  apply(template: transforms.CfTemplateType): transforms.CfTemplateType {
    let res = template.Resources[this.resourceId];
    if (res) {
      console.log(JSON.stringify(res, undefined, 2));
    }
    return template;
  }
}

export class FindingConstructs01 extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);
    Logger.set(this, new Logger());

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

    let resources = new CfnElementUtilities().cfnResources(this);
    console.log(`${resources.length} resources.`);
    console.log(resources.map(x => `${x.node.path} (${x.cfnResourceType})`));

    /*
    let lambdaTask = resources.filter(x => x.cfnResourceType == 'Custom::LambdaTask').pop()!;
    (new transforms.Echo(lambdaTask, 'Echo'), new Logger());
    */
    /*
    new EchoResolved(this, 'EchoResolved', 'GreetingLambdaTask6113D194');
    */
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new FindingConstructs01(app, 'cdk-orchestration-examples-dev', { env: devEnv });
// new MyStack(app, 'cdk-orchestration-examples-prod', { env: prodEnv });

app.synth();