//import { AppToken, BUILD_TIME, Log, Logger, StackToken } from '@michanto/cdk-orchestration';
import { AppToken, BUILD_TIME, Log, Logger, StackToken } from '@michanto/cdk-orchestration';
import { App, Aws, Fn, Lazy, Stack, StackProps } from 'aws-cdk-lib';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class TokensTokensTokens extends Stack {
  constructor(scope: Construct, id: string = 'TokensTokensTokens', props: StackProps = {}) {
    super(scope, id, props);
    Logger.set(this, new Logger());
    let log = Log.of(this);
    log.info('// Tokens, Tokens, Tokens! //');

    let app = this.node.root as App;

    // Stable tokens
    log.info('// Stable tokens //');
    let spider = Lazy.string({ produce: () => 'Shelob' });
    log.info(spider);

    log.info('// Stable token with display hint');
    let spiderMother = Lazy.string({ produce: () => 'Ungoliant' }, { displayHint: 'SPDR' });
    log.info(spiderMother);

    // Resolve tokens
    log.info('// Resolve stable tokens');
    log.info(this.resolve(spider));
    log.info(this.resolve(spiderMother));

    // Uncached tokens
    log.info('// Uncached tokens //');

    let regionToken = Lazy.uncachedString({ produce: (ctx) => Stack.of(ctx.scope).region }, { displayHint: 'RGN' });

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
    log.info('// Print uncached token');
    log.info(regionToken);

    log.info('// Resolve in Valinor stack');
    log.info(valinor.resolve(regionToken));
    log.info('// Resolve in Beleriand stack');
    log.info(beleriand.resolve(regionToken));

    log.info('// Intrinsic token //');
    log.info(Aws.REGION);
    log.info(JSON.stringify(valinor.resolve(Aws.REGION)));
    log.info(JSON.stringify(beleriand.resolve(Aws.REGION)));

    log.info('// Complex intrinsic token //');
    let complexToken = Fn.getAzs(Aws.REGION);
    log.info(JSON.stringify(complexToken));
    log.info(JSON.stringify(valinor.resolve(complexToken)));
    log.info(JSON.stringify(beleriand.resolve(complexToken)));

    log.info('// @michanto/cdk-orchestration AppToken //');
    let buildIdToken = AppToken.string(this, 'CdkOrch::BuildId', {
      displayHint: 'BLDID',
    });
    log.info(JSON.stringify(buildIdToken));
    log.info(this.toJsonString(buildIdToken));

    log.info('// @michanto/cdk-orchestration StackToken //');
    let unresolvedToken = StackToken.string(this, 'UnresolvedToken', {
      displayHint: 'UNRESOLVED',
    });
    let samBucket = StackToken.string(this, 'SAM::Bucket', {
      displayHint: 'SAM',
    });
    let samLambdaKey = StackToken.string(this, 'SAM::Key', {
      displayHint: 'SAM',
    });
    log.info(unresolvedToken);
    log.info(samBucket);
    log.info(samLambdaKey);
    try {
      log.info(`UnresolvedToken = '${this.resolve(unresolvedToken)}'`);
    } catch {
      log.info(`Could not resolve ${unresolvedToken}`);
    }

    log.info('// Use the StackTokens in a function. //');
    let codeBucket = Bucket.fromBucketName(this, 'CodeBucket', samBucket);
    let codeKey = samLambdaKey;

    new Function(this, 'Yavanna', {
      runtime: Runtime.NODEJS_16_X,
      code: Code.fromBucket(codeBucket, codeKey),
      handler: 'handler',
    });

    log.info('// Resolve all StackTokens //');
    let bucket = new Bucket(this, 'SamBucket');
    let objectKey = `${buildIdToken}/code.zip`;

    StackToken.resolveString(this, 'SAM::Bucket', { produce: () => bucket.bucketName });
    StackToken.resolveString(this, 'SAM::Key', { produce: () => objectKey });
    StackToken.resolveString(this, 'UnresolvedToken', { produce: () => 'Now Resolved' });
    try {
      log.info(`UnresolvedToken = '${this.resolve(unresolvedToken)}'`);
    } catch {
      log.info(`Could not resolve ${unresolvedToken}`);
    }

    AppToken.resolveAny(this, 'CdkOrch::BuildId', { produce: () => BUILD_TIME });

    log.info(JSON.stringify(this.resolve(samBucket)));
    log.info(this.resolve(samLambdaKey));

    log.info(this.resolve(buildIdToken));
  }
}