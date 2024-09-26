import { AppToken, BUILD_TIME, Log, StackToken } from '@michanto/cdk-orchestration';
import { S3FileResource } from '@michanto/cdk-orchestration/orchestration';
import { App, Stack, StackProps } from 'aws-cdk-lib';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { IBucket, Bucket } from 'aws-cdk-lib/aws-s3';
import { md5hash } from 'aws-cdk-lib/core/lib/helpers-internal';
import { PhysicalResourceId } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

const NAMESPACE = '@michanto/cdk-orchestration-examples';

/** Token names for use with AppToken and StackToken . */
const NAMED_BUCKET_TKN = `${NAMESPACE}.NamedBucket`;
const UNNAMED_BUCKET_TKN = `${NAMESPACE}.UnnamedBucket`;
const BUILD_ID_TKN = `${NAMESPACE}.BuildId`;

/**
 * Class that creates the tokens we use in our App.
 */
export class SampleTokens {
  /** Resolves to the name of the Named Bucket. */
  static namedBucketNameToken(scope: Construct) {
    return AppToken.string(scope, NAMED_BUCKET_TKN, { displayHint: 'NmdBkt' });
  }

  /**
   * Separate token creation from token resolution.
   * Useful for cross-stack references without having to pass constructs.
   */
  static resolveNamedBucketNameToken(scope: Construct) {
    AppToken.resolveString(scope, NAMED_BUCKET_TKN, {
      produce: () => {
        let stack = Stack.of(scope);
        return `artifact-bucket-${stack.account}-${stack.region}-${
          md5hash(stack.node.path).slice(0, 8).toLowerCase()
        }`;
      },
    });
  }

  /** Resolves to the name of the unnamed Bucket (name will be generated at deployment time). */
  static unnamedBucketNameToken(scope: Construct) {
    return AppToken.string(scope, UNNAMED_BUCKET_TKN, { displayHint: 'UnnmdBkt' });
  }

  /*
  * Separate token creation from token resolution.
  * Useful for cross-stack references without having to pass constructs.
  */
  static resolveUnnamedBucketNameToken(scope: Construct, bucket: IBucket) {
    AppToken.resolveString(scope, UNNAMED_BUCKET_TKN, {
      produce: () => {
        return bucket.bucketName;
      },
    });
  }

  /**
   * Token for the buildId, which defaults to a timestamp, but is configurable.
   *
   * At Synthesis time, this token is resolved by checking a dictionary attached to the
   * App construct.
   *
   * @param scope Any scope in the app will do, as this is an AppToken.
   * @returns A string that prints as `${Token[BLDID.<token id>]}`
   */
  static buildIdToken(scope: Construct) {
    return AppToken.string(scope, BUILD_ID_TKN, {
      displayHint: 'BLDID',
    });
  }

  /**
   * Resolves the token named "CdkOrche::BuildId"
   * Resolved to any, but CDK will call toString() when writing the value since the token
   * is a string. Note BUILD_TIME is a number.
   * @param scope Any scope in the app will do, as this is an AppToken.
   * @param value
   */
  static resolveBuildIdToken(scope: Construct, value: any = BUILD_TIME) {
    AppToken.resolveAny(scope, BUILD_ID_TKN, { produce: () => value });
  }
}


export class OtherStack extends Stack {
  constructor(scope: Construct, id: string = 'ArtifactBucketsStack', props?: StackProps) {
    super(scope, id, props);
    let log = Log.of(this);

    log.info('// @michanto/cdk-orchestration AppToken //');
    let buildIdToken = AppToken.string(this, 'build_id', {
      displayHint: 'BLDID',
    });
    log.info(JSON.stringify(buildIdToken));
    log.info(this.toJsonString(buildIdToken));

    // Application scoped named token.
    let bucketToken = AppToken.string(this, 'code_bucket', {
      displayHint: 'Bkt',
    });

    log.info('// @michanto/cdk-orchestration StackToken //');
    let app = this.node.root as App;

    let valinor = new Stack(app, `${this.stackName}-Valinor`, {
      env: {
        account: this.account, region: 'us-east-1',
      },
    });

    let beleriand = new Stack(app, `${this.stackName}-Beleriand`, {
      env: {
        account: this.account, region: 'eu-west-1',
      },
    });
    log.info('// Create Stack token in two different stacks. //');
    for (let stack of [valinor, beleriand]) {
      let keyToken = StackToken.string(stack, 'code_key', {
        displayHint: 'Key',
      });
      let codeBucket = Bucket.fromBucketName(stack, 'CodeBucket', bucketToken);
      new Function(stack, 'MyFunction', {
        runtime: Runtime.NODEJS_16_X,
        code: Code.fromBucket(codeBucket, keyToken),
        handler: 'handler',
      });
      StackToken.resolveString(stack, 'code_key', {
        produce: () => `${
          stack.stackName.toLowerCase()
        }/${
          buildIdToken
        }/code.zip`,
      });
    }
    let unresolvedToken = StackToken.string(this, 'unresolved_token', {
      displayHint: 'Unres',
    });
    log.info(unresolvedToken);
    try {
      log.info(`UnresolvedToken = '${this.resolve(unresolvedToken)}'`);
    } catch {
      log.info(`Could not resolve ${unresolvedToken}`);
    }

    StackToken.resolveString(this, 'unresolved_token', { produce: () => 'Now Resolved' });
    try {
      log.info(`UnresolvedToken = '${this.resolve(unresolvedToken)}'`);
    } catch {
      log.info(`Could not resolve ${unresolvedToken}`);
    }

    // Resolve app tokens.
    AppToken.resolveAny(this, 'build_id', { produce: () => BUILD_TIME });
    // Explicitly named bucket for use cross-region.
    let codeBucketName = `code-bucket-${this.account}`;
    new Bucket(this, 'CodeBucket', {
      bucketName: codeBucketName,
    });
    // Resolve bucket name.
    AppToken.resolveString(this, 'code_bucket', { produce: () => codeBucketName });

    log.info(this.resolve(buildIdToken));
  }
}
/**
 * The artifact bucket will be used to store artifact creation products.
 */
export class ArtifactBucketsStack extends Stack {
  constructor(scope: Construct, id: string = 'ArtifactBucketsStack', props?: StackProps) {
    super(scope, id, props);

    new Bucket(this, 'NamedBucket', {
      bucketName: SampleTokens.namedBucketNameToken(this),
    });
    SampleTokens.resolveNamedBucketNameToken(this);

    const unnamedBucket = new Bucket(this, 'UnnamedBucket', {
    });
    SampleTokens.resolveUnnamedBucketNameToken(this, unnamedBucket);
  }
}

/**
 * Rather than pass the ArtifactBucket to this class, it can use the token.
 */
export class ArtifactWriterStack extends Stack {
  constructor(scope: Construct, id: string = 'ArtifactWriter', props?: StackProps) {
    super(scope, id, props);
    let namedBucket = Bucket.fromBucketName(this, 'NamedBucket', SampleTokens.namedBucketNameToken(this));
    let unnamedBucket = Bucket.fromBucketName(this, 'UnnamedBucket', SampleTokens.unnamedBucketNameToken(this));

    new S3FileResource(this, 'Written2NamedBucket', {
      bucket: namedBucket,
      key: 'buildid.json',
      body: {
        buildId: SampleTokens.buildIdToken(this),
      },
      physicalResourceId: PhysicalResourceId.of('buildid.json'),
    });
    new S3FileResource(this, 'Written2UnnamedBucket', {
      bucket: unnamedBucket,
      key: 'buildid.json',
      body: {
        buildId: SampleTokens.buildIdToken(this),
      },
      physicalResourceId: PhysicalResourceId.of('buildid.json'),
    });
  }
}
