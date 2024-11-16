import { CustomResourceUtilities } from '@michanto/cdk-orchestration/custom-resources';
import { Echo, ImportOrders, Joiner } from '@michanto/cdk-orchestration/transforms';
import { Stack, StackProps } from 'aws-cdk-lib';
import { StateMachine, DefinitionBody } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { GreetingLambdaTask } from '../constructs/greeting_lambda_task';
import { HitlTestStepFunctionDefinition } from '../constructs/hitl_test_step_fn';

/**
 * Echo is a Transform, and Transforms work out-of-the-box with L1 or L2 constructs.
 * Otherwise, the default is for a transform to be applied to the stack.
 *
 * Since we want this Transform to be applied to the custom resource in an L3 construct
 * (such as Task or AwsCustomResource), we need to override the target property to
 * return the correct L1 construct.
 */
export class EchoCustomResource extends Echo {
  get target() {
    return new CustomResourceUtilities().findCustomResource(this.node.scope!);
  }
}

export class EchoCustomResourceAfterEncode extends EchoCustomResource {
  get order() {
    // Encode runs in WRITER order.
    return ImportOrders.WRITER;
  }
}

export class OrderedTransforms extends Stack {
  constructor(scope: Construct, id: string = 'TransformsInfo', props?: StackProps) {
    super(scope, id, props);
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
    new EchoCustomResource(task, 'EchoCustomResource');
    new EchoCustomResourceAfterEncode(task, 'EchoCustomResourceAfterEncode');
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
