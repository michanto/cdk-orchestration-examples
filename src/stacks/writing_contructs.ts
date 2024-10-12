import { BUILD_TIME, CfnElementUtilities, ConstructRunTimeTypeInfo, ICfnResourcePredicate } from '@michanto/cdk-orchestration';
import { InlineNodejsFunction } from '@michanto/cdk-orchestration/aws-lambda-nodejs';
import { CustomResourceUtilities } from '@michanto/cdk-orchestration/custom-resources';
import { CfnResource, Resource, Stack, StackProps } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Trigger } from 'aws-cdk-lib/triggers';
import { Construct, IConstruct } from 'constructs';
import { NAMESPACE } from '../private/internal';

const LAMBDA_PATH = `${__dirname}/../../lib/constructs/lambdas/`;

/**
 * A well designd construct has a Properties interface with readonly members.
 */
export interface AddMetadataProperties {
  /** Metadata key. */
  readonly key: string;
  /** Metadata value. */
  readonly value: any;
  /** Resource type to add metadata to. Optional. */
  readonly resourceType?: string;
  /** Predicate to use when searching for CfnResource. Optional. */
  readonly predicate?: ICfnResourcePredicate;
}

/**
 * This construct adds metadata to a Stack or a CfnResource.
 *
 * A well designed construct has documentation.
 *
 * A well designed construct works with Stacks (if applicable),
 * L1, L2 or L3 constructs without the user having to navigate
 * the construct tree.
 */
export class AddMetadata extends Construct {
  /** RTTI is optional depending on your use case. */
  static isAddMetadata(x: IConstruct): x is AddMetadata {
    return AddMetadata.ADD_METADATA_CONSTRUCT_RTTI.hasRtti(x);
  }

  private static readonly ADD_METADATA_CONSTRUCT_RTTI = new ConstructRunTimeTypeInfo({
    servicePropertyName: `${NAMESPACE}.AddMetadata`,
  });

  constructor(scope: Construct, id: string, readonly props: AddMetadataProperties) {
    super(scope, id);

    AddMetadata.ADD_METADATA_CONSTRUCT_RTTI.addRtti(this);
    this.target.addMetadata(props.key, props.value);
  }

  /**
   * By puttng the target in a getter, subclasses can easily override the target.
   *
   * That really expands the usefulness of our Construct
   */
  get target(): CfnResource | Stack {
    let scope = this.node.scope!;

    // If either of these are specified, use findCfnResource.
    if (this.props?.resourceType || this.props?.predicate) {
      // This function will throw if more than one matching CfnResource is found under the scope,
      // or if no matching resource is found.
      return new CfnElementUtilities().findCfnResource(scope, this.props.resourceType, this.props.predicate);
    }

    // If this construct is added to a stack, the user wants stack metadata.
    // Otherwise, the user wants CfnResource metadata.
    if (Stack.isStack(scope)) {
      return scope;
    }
    // If the scope is an L1, return it.
    if (CfnElementUtilities.isCfnResource(scope)) {
      return scope;
    }
    // If the scope is an L2, return the L1
    if (Resource.isResource(scope) && scope.node.defaultChild) {
      return scope.node.defaultChild as CfnResource;
    }

    // If there is a single CfnResource under the scope, we'll add metadata to it.
    // This supports the L3 construct case.
    return new CfnElementUtilities().findCfnResource(scope);
  }
}

/** Optional properties for AddSalt construct. */
export interface AddSaltProperties {
  /** Custom Resource type to add salt to. Optional. */
  readonly resourceType?: string;
  /** Predicate to use when searching for the custom resource. Optional. */
  readonly predicate?: ICfnResourcePredicate;
}

/**
 * Adds Salt property to any custom resource.
 * NOTE:  This exists in cdk-orchestration as RunResourceAlways construct.
 *
 * In the CDK Tiggers [documentation](
 * https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.triggers-readme.html) it says:
 * >> In the future we will consider adding support for additional re-execution modes:
 *
 * >> `executeOnEveryDeployment`: boolean - re-executes every time the stack is
 * deployed (add random "salt" during synthesis).
 *
 * We can go ahead and implement that, but for ANY custom resource.
 */
export class AddSalt extends Construct {
  constructor(scope: Construct, id: string = 'AddSalt', readonly props?: AddSaltProperties) {
    super(scope, id);
    this.target.addPropertyOverride('salt', BUILD_TIME);
  }

  get target() {
    let scope = this.node.scope!;
    return new CustomResourceUtilities().findCustomResource(scope,
      this.props?.resourceType, this.props?.predicate);
  }
}

/**
 *
 */
export class WritingConstructs extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    new AddMetadata(this, 'StackMetadata', {
      key: 'StackMetadata', value: 'Arondir',
    });

    let bucket = new Bucket(this, 'MyBucket');
    new AddMetadata(bucket, 'BucketMetadata', {
      key: 'BucketMetadata', value: 'Taniquetil',
    });

    const echoLambda = new InlineNodejsFunction(this, 'EchoLambda', {
      entry: `${LAMBDA_PATH}/echo.js`,
      environment: {
        LogLevel: '1',
      },
    });

    let trigger = new Trigger(this, 'TiggerEcho', {
      handler: echoLambda,
    });
    new AddSalt(trigger);
  }
}