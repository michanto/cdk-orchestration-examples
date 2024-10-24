import { BUILD_TIME, CfnElementUtilities } from '@michanto/cdk-orchestration';
import { InlineNodejsFunction } from '@michanto/cdk-orchestration/aws-lambda-nodejs';
import { CustomResourceUtilities, RunResourceAlways } from '@michanto/cdk-orchestration/custom-resources';
import { CfnElement, CfnResource, Stack, StackProps } from 'aws-cdk-lib';
import { CfnRole } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';
import { Trigger } from 'aws-cdk-lib/triggers';
import { Construct } from 'constructs';

const LAMBDA_PATH = `${__dirname}/../../lib/constructs/lambdas/`;

/**
 * # AddSalt escape hatch construct.
 *
 * In the CDK Triggers [documentation](
 * https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.triggers-readme.html) it says:
 * >> In the future we will consider adding support for additional re-execution modes:
 * >> - `executeOnEveryDeployment`: boolean - re-executes every time the stack is
 * deployed (add random "salt" during synthesis).
 *
 * AddSalt implements that, but for ANY custom resource.  The random salt is a build timestamp,
 * calculated as Date.now() at library-load time.
 *
 * NOTE:  This class is in cdk-orchestration library as RunResourceAlways.
 */
export class AddSalt extends Construct {
  constructor(scope: Construct, id: string = 'AddSalt') {
    super(scope, id);
    this.target.addPropertyOverride('salt', BUILD_TIME);
  }

  /**
   * By puttng the target in a getter, subclasses can easily override the target.
   * This expands the usefulness of our Construct.
   *
   * For example, the user could target a specfic resource type in a sub tree.
   */
  get target() {
    let scope = this.node.scope!;
    return new CustomResourceUtilities().findCustomResource(scope);
  }
}

/**
 * This construct demonstrates that any CfnElement (L1 construct) can add to the stack description.
 *
 * CfnElements return a CloudFormation template fragment that gets merged into the stack template.json file.
 **/
export class StackDescription extends CfnElement {
  constructor(scope: Construct, id: string, readonly description: string) {
    super(scope, id);
  }

  /**
   * Abstract method that returns a CloudFormation template fragment.
   */
  _toCloudFormation(): object {
    return {
      Description: this.description,
    };
  }
}

/**
 * Properties interface for AddMetadata class.
 * All properties interface members should be readonly.
 */
export interface AddMetadataProperties {
  /** Metadata key. */
  readonly key: string;
  /** Metadata value. */
  readonly value: any;
}

/**
 * This construct adds metadata to a Stack or a CfnResource.
 *
 * A well designed construct has documentation.
 *
 * An well designed escape hatch construct works with Stacks (if applicable),
 * L1, L2 or L3 constructs without the user having to navigate
 * the construct tree.
 */
export class AddMetadata extends Construct {
  constructor(scope: Construct, id: string, readonly props: AddMetadataProperties) {
    super(scope, id);

    this.target.addMetadata(props.key, props.value);
  }

  /**
   * By puttng the target in a getter, subclasses can easily override the target.
   * This expands the usefulness of our Construct.
   * For example, the user could target a specfic resource type in a sub tree.
   */
  get target(): CfnResource | Stack {
    let scope = this.node.scope!;

    // If this construct is added to a stack, the user wants to add stack metadata.
    // Otherwise, the user wants to add CfnResource metadata.
    if (Stack.isStack(scope)) {
      return scope;
    }

    // Otherwise the user wants to add metadata to a CfnResource under scope.
    return new CfnElementUtilities().findCfnResource(scope);
  }
}

/**
 * Show how to use [Escape Hatches](https://docs.aws.amazon.com/cdk/v2/guide/cfn_layer.html)
 * in the CDK.
 *
 * The 'cfn layer' document recommends using L1 methods and raw overrides as escape hatches.
 * Here, we'll see that we can encapsulate these as constructs and use searches to make working
 * with escape hatches more natural.
 */
export class EscapeHatches extends Stack {
  constructor(scope: Construct, id: string = 'EscapeHatches', props?: StackProps) {
    super(scope, id, { ...props, description: 'EscapeHatches description.' });

    new StackDescription(this, 'Description', 'This string will be in the stack description.');
    new StackDescription(this, 'Description2', 'And so will this one.');

    new AddMetadata(this, 'StackMetadata', {
      key: 'Elf', value: 'Arondir',
    });

    let bucket = new Bucket(this, 'MyBucket');
    new AddMetadata(bucket, 'BucketMetadata', {
      key: 'Mountain', value: 'Taniquetil',
    });

    const echoLambda = new InlineNodejsFunction(this, 'EchoLambda', {
      entry: `${LAMBDA_PATH}/echo.js`,
      environment: {
        LogLevel: '1',
      },
    });

    new AddMetadata(echoLambda, 'FunctionMetadata', {
      key: 'Dwarf', value: 'Balin',
    });

    new class AddRoleMetadata extends AddMetadata {
      get target(): CfnResource | Stack {
        return new CfnElementUtilities().findCfnResource(this.node.scope!, CfnRole.CFN_RESOURCE_TYPE_NAME);
      }
    }(echoLambda, 'RoleMetadata', {
      key: 'Maia', value: 'Bombadillo',
    });

    let trigger = new Trigger(this, 'EchoTrigger', {
      handler: echoLambda,
    });
    new AddSalt(trigger);

    let writer = new AwsCustomResource(this, 'MyS3FileResource', {
      onUpdate: {
        service: 'S3',
        action: 'putObject',
        parameters: {
          Body: JSON.stringify({ dummy: 'data' }),
          Bucket: bucket.bucketName,
          Key: 'dummy.json',
        },
        physicalResourceId: PhysicalResourceId.of(`s3:://${bucket.bucketName}/dummy.json`),
      },
      installLatestAwsSdk: false,
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
      }),
    });
    new RunResourceAlways(writer);
  }
}
