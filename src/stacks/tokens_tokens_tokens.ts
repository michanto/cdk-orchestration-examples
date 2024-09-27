import { readFileSync } from 'fs';
import { Log, Logger, StackUtilities } from '@michanto/cdk-orchestration';
import { App, Aws, Fn, IStableStringProducer, Lazy, Stack, StackProps, Token } from 'aws-cdk-lib';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

/**
 * In this lesson we learn:
 * - How to name buckets using tokens.
 * - How buckets use tokens to reference the bucket name.
 * - How to write a string token that resolves to CloudFormation.
 * - The difference between stable tokens and uncached tokens.
 * - How to write an inline lambda.
 * - Why you shouldn't call resolve on tokens except as a debugging aid.
 */
export class TokensTokensTokens extends Stack {
  constructor(scope: Construct, id: string = 'TokensTokensTokens', props?: StackProps) {
    super(scope, id, props);
    Logger.set(this, new Logger());

    let log = Log.of(this);
    log.info('//** Tokens, Tokens, Tokens! **//');

    log.info('// Bucket names and tokens');

    /**
     * One option: don't name the bucket.
     * S3 will create a name for you.
     */
    let unnamedBkt = new Bucket(this, 'UnnamedBucket', {
      bucketName: undefined,
    });
    /**
     * Note that the bucket.bucketName is a always a token that
     * resolved to a Fn::Ref for the S3 bucket, which always resolves
     * to the bucket name.
     */
    log.info(`UnnamedBucket name ref: '${unnamedBkt.bucketName}' resolved: ${
      !Token.isUnresolved(unnamedBkt.bucketName)} value: ${
      JSON.stringify(this.resolve(unnamedBkt.bucketName))
    }`);

    /** Buckets can also be named with constant string. */
    let staticName = 'static-named-000000000000-us-west-2';
    let staticNamedBucket = new Bucket(this, 'StaticNamedBucket', {
      bucketName: staticName,
    });
    log.info(`StaticNamedBucket name ref: '${staticNamedBucket.bucketName}' resolved: ${
      !Token.isUnresolved(staticNamedBucket.bucketName)} value: ${
      JSON.stringify(this.resolve(staticNamedBucket.bucketName))
    }`);
    log.info(`StaticNamedBucket name: ${staticName} resolved: ${
      !Token.isUnresolved(staticName)}`);

    /** Buckets can be named with an Fn.join */
    let joinName = Fn.join('-', ['join', 'named', Aws.ACCOUNT_ID, Aws.REGION]);
    new Bucket(this, 'JoinNamedBucket', {
      bucketName: joinName,
    });
    log.info(`JoinNamedBucket name: '${joinName}' resolved: ${
      !Token.isUnresolved(joinName)}`);

    /**
     * How does that work?  The Fn.join function returns a string,
     * but produces an ANY in CloudFormation?  It returns an Any token,
     * which can resolve to a number, string, or JSON, then calls Token.asString
     * to create a string token that resolves to the Any.
     * Note the desplayHint is passed to both the Any token and the string token.
     */
    let myJoin = function (delim: string, values: string[]) {
      return Token.asString(Lazy.any({
        produce: () => {
          // If all values are fully resolved, return the constant.
          if (values.every(val => !Token.isUnresolved(val))) {
            return values.join(delim);
          }
          return { 'Fn::Join': [delim, values] };
        },
      }, { displayHint: 'MyJoin' }), { displayHint: 'MyJoin' });
    };

    let allStringsResolved = myJoin('-', ['all', 'strings', 'resolved']);
    log.info('// My version of Join.');
    log.info(allStringsResolved);
    log.info(this.resolve(allStringsResolved));
    log.info(JSON.stringify(this.resolve(
      myJoin('-', ['some', 'strings', 'resolved', Aws.ACCOUNT_ID]))));

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
    let spiderMother = Lazy.string({ produce: () => 'Ungoliant' },
      { displayHint: 'Spider' });
    log.info(spiderMother);

    // Resolve tokens
    log.info('// Resolve stable tokens');
    log.info(this.resolve(spider));
    log.info(this.resolve(spiderMother));

    // Uncached tokens
    log.info('// Uncached tokens //');

    let regionToken = Lazy.uncachedString({
      produce: (ctx) => Stack.of(ctx.scope).region,
    }, { displayHint: 'Region' });

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

    let allStacksProducer: IStableStringProducer = {
      produce: () => new StackUtilities().stacks(app).map(s => s.stackName).join(','),
    };

    /** By resolving this token now, it won't pick up stacks created later. */
    let someStacks = Lazy.string(allStacksProducer, { displayHint: 'Stacks' });
    this.resolve(someStacks);

    new Function(this, 'StackNamesEnv', {
      code: Code.fromInline(readFileSync(`${__dirname}/../../lib/constructs/lambdas/echo.js`).toString()),
      handler: 'index.handler',
      runtime: Runtime.NODEJS_20_X,
      environment: {
        STACK_NAMES: Lazy.string(allStacksProducer, { displayHint: 'Stacks' }),
        SOME_STACK_NAMES: someStacks,
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