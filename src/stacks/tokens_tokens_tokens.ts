import { readFileSync } from 'fs';
import { Log, Logger, StackUtilities } from '@michanto/cdk-orchestration';
import { App, Aws, Fn, Lazy, Stack, StackProps, Token } from 'aws-cdk-lib';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class TokensTokensTokens extends Stack {
  constructor(scope: Construct, id: string = 'TokensTokensTokens', props?: StackProps) {
    super(scope, id, props);
    Logger.set(this, new Logger());

    let log = Log.of(this);
    log.info('// Tokens, Tokens, Tokens! //');

    log.info('// How to name a bucket //');
    let unnamedBkt = new Bucket(this, 'UnnamedBucket', {
      bucketName: undefined,
    });
    log.info(`UnnamedBucket name ref: '${unnamedBkt.bucketName}' resolved: ${
      !Token.isUnresolved(unnamedBkt.bucketName)} value: ${
      JSON.stringify(this.resolve(unnamedBkt.bucketName))
    }`);

    let staticName = 'static-named-000000000000-us-west-2';
    let staticNamedBucket = new Bucket(this, 'StaticNamedBucket', {
      bucketName: staticName,
    });
    log.info(`StaticNamedBucket name ref: ${staticNamedBucket.bucketName} resolved: ${
      !Token.isUnresolved(staticNamedBucket.bucketName)} value: ${
      JSON.stringify(this.resolve(staticNamedBucket.bucketName))
    }`);
    log.info(`StaticNamedBucket name: ${staticName} resolved: ${
      !Token.isUnresolved(staticName)}`);

    let joinName = Fn.join('-', ['join', 'named', Aws.ACCOUNT_ID, Aws.REGION]);
    new Bucket(this, 'JoinNamedBucket', {
      bucketName: joinName,
    });
    log.info(`JoinNamedBucket name: '${joinName}' resolved: ${
      !Token.isUnresolved(joinName)}`);

    let implicitJoinName = `implicit-join-name-${Aws.ACCOUNT_ID}-${Aws.REGION}`;
    new Bucket(this, 'ImplicitJoinNamedBucket', {
      bucketName: implicitJoinName,
    });
    log.info(`ImplicitJoinNamedBucket name: '${implicitJoinName}' resolved: ${
      !Token.isUnresolved(implicitJoinName)}`);

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

    new Function(this, 'StackNamesEnv', {
      code: Code.fromInline(readFileSync(`${__dirname}/../../lib/constructs/lambdas/echo.js`).toString()),
      handler: 'index.handler',
      runtime: Runtime.NODEJS_20_X,
      environment: {
        STACK_NAMES: Lazy.string({
          produce: () => new StackUtilities().stacks(app).map(s => s.stackName).join(','),
        }),
        SPIDER: spider,
        SPIDER_MOTHER: spiderMother,
        UNNAMED_BUCKET: unnamedBkt.bucketName,
        STATIC_NAMED_BUCKET: staticNamedBucket.bucketName,
        REGION_TOKEN: regionToken,
      },
    });

    new Stack(app, `${this.stackName}-AnotherStack`);
  }
}