import { ConstructRunTimeTypeInfo, ConstructTreeSearch, IStopCondition, Log, Logger, LogLevel } from '@michanto/cdk-orchestration';
import { App, CfnElement, Stack, StackProps } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct, IConstruct } from 'constructs';
import { NAMESPACE } from '../private/internal';

/** A construct with RTTI for testing. */
export class TypedConstruct extends Construct {
  /** Type assertion for TypedConstruct. */
  static isTypedConstruct(x: IConstruct): x is TypedConstruct {
    return TypedConstruct.TYPED_CONSTRUCT_RTTI.hasRtti(x);
  }

  /**
   * Return the TypedConstruct hosting the given construct.
   */
  static of(x: IConstruct): TypedConstruct | undefined {
    let host = TypedConstruct.TYPED_CONSTRUCT_RTTI.searchUp(x);
    return host as TypedConstruct | undefined;
  }

  /**
   * Return all typed constructs under the given scope.
   */
  static typedConstructs(scope: IConstruct, stopCondition?: IStopCondition) {
    return ConstructTreeSearch.for(TypedConstruct.isTypedConstruct)
      .searchDown(scope, stopCondition);
  }

  private static readonly TYPED_CONSTRUCT_RTTI = new ConstructRunTimeTypeInfo({
    servicePropertyName: `${NAMESPACE}.test.TypedConstruct`,
  });

  constructor(scope: Construct, id: string) {
    super(scope, id);
    TypedConstruct.TYPED_CONSTRUCT_RTTI.addRtti(this);
  }
}

/**
 * Demonstrate built in and custom RTTI in the CDK.
 */
export class ConstructRtti extends Stack {
  constructor(scope: IConstruct, id: string, props?: StackProps) {
    super(scope, id, props);
    let app = this.node.root as App;
    Logger.set(app, new Logger({ logLevel: LogLevel.INFO }));
    let log = Log.of(this);

    // Built in RTTI
    log.info(`This construct is a stack: ${Stack.isStack(this)}`);
    log.info(`This construct is a construct: ${Construct.isConstruct(this)}`);
    log.info(`This construct is a CfnElement?: ${CfnElement.isCfnElement(this)}`);

    new TypedConstruct(this, 'UnderStack');
    new TypedConstruct(this.node.root, 'UnderApp');
    let bucket = new Bucket(this, 'MyBucket');
    new TypedConstruct(bucket, 'UnderBucket');
    new TypedConstruct(bucket.node.defaultChild!, 'UnderCfnBucket');
    let parent = new TypedConstruct(this, 'AParent');
    let hostedBucket = new Bucket(parent, 'HostedBucket');
    let subStack = new Stack(this, 'SubStack');
    new TypedConstruct(subStack, 'UnderSubStack');

    log.info(`isTypedConstruct true example: ${
      TypedConstruct.isTypedConstruct(parent)}`);
    log.info(`isTypedConstruct false example: ${
      TypedConstruct.isTypedConstruct(bucket)}`);
    log.info(`TypedConstructs in this app:\n${
      TypedConstruct.typedConstructs(app).map(c => c.node.path).join('\n  ')}`);
    log.info(`TypedConstructs in this stack:\n${
      TypedConstruct.typedConstructs(this, Stack.isStack).map(c => c.node.path).join('\n  ')}`);
    log.info(`TypedConstructs under this stack:\n${
      TypedConstruct.typedConstructs(this).map(c => c.node.path).join('\n  ')}`);
    log.info(`TypedConstructs in the sub stack:\n${
      TypedConstruct.typedConstructs(subStack).map(c => c.node.path).join('\n  ')}`);
    log.info(`TypedConstruct above hostedBucket:\n${
      TypedConstruct.of(hostedBucket)!.node.path}`);
    // Get the stack of all TypedConstructs under the Stack
    TypedConstruct.typedConstructs(this).forEach(t => Stack.of(t));
  }
}
