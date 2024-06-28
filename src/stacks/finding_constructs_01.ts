import { CfnElementUtilities } from '@michanto/cdk-orchestration';
import { Echo } from '@michanto/cdk-orchestration/transforms';
import { Stack, StackProps } from 'aws-cdk-lib';
import { DefinitionBody, StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { GreetingLambdaTask } from '../constructs/greeting_lambda_task';
import { HitlTestStepFunctionDefinition } from '../constructs/hitl_test_step_fn';
import { PyStepFunctionsImport } from '../constructs/py_step_functions_cleanup';


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

    /** /
    let resources = new CfnElementUtilities().cfnResources(this);
    console.log(`${resources.length} resources.`);
    console.log(resources.map(x => `${x.node.path} (${x.cfnResourceType})`));

    /** /
    let lambdaTask = resources.filter(x => x.cfnResourceType == 'Custom::LambdaTask').pop()!;
    new Echo(lambdaTask, 'Echo');
    /** /
    new RemoveSalt(lambdaTask);

    /** END */
  }
}
