import { CfnElementUtilities, ConstructTreeSearch, Log, Logger, LogLevel, StackUtilities } from '@michanto/cdk-orchestration';
import { CfnIncludeToCdk } from '@michanto/cdk-orchestration/cloudformation-include';
import { CustomResourceUtilities } from '@michanto/cdk-orchestration/custom-resources';
import { StepFunctionTask } from '@michanto/cdk-orchestration/orchestration';
import { App, CfnElement, CfnResource, Resource, Stack, StackProps } from 'aws-cdk-lib';
import { CfnBucket, Bucket } from 'aws-cdk-lib/aws-s3';
import { DefinitionBody, StateMachine, State } from 'aws-cdk-lib/aws-stepfunctions';
import { AwsCustomResource, PhysicalResourceId, AwsCustomResourcePolicy } from 'aws-cdk-lib/custom-resources';
import { Construct, IConstruct } from 'constructs';
import { GreetingLambdaTask } from '../constructs/greeting_lambda_task';
import { HitlTestStepFunctionDefinition } from '../constructs/hitl_test_step_fn';
import { ImportEchoInputStepFunction } from '../constructs/py_step_functions_cleanup';

/**
 * You can't modify your CloudFormation template JSON if you can't find
 * the L1 constructs that produce that JSON. Navigating the construct tree is not always easy,
 * especially when using libraries with L3 constructs.
 *
 * Here, we will create a bunch of resources and then look for constructs in tree.
 */
export class FindingConstructs extends Stack {
  constructor(scope: Construct, id: string = 'FindingConstructs', props: StackProps = {}) {
    super(scope, id, props);
    let app = this.node.root as App;
    Logger.set(app, new Logger({ logLevel: LogLevel.INFO }));
    let log = Log.of(this);

    let constructSearch = ConstructTreeSearch.for(Construct.isConstruct);
    log.info(`Total number of constructs in app: ${constructSearch.searchDown(app).length}`);
    log.info(`Total number of constructs in stack: ${constructSearch.searchDown(this).length}`);

    /**
     * First let's create some predicates to use when searching
     */
    /** This predicate will tell us if an L1 CfnResource is a CfnBucket. */
    const isCfnBucket = function isCfnBucket(x: IConstruct): x is CfnBucket {
      return CfnElement.isCfnElement(x)
        && CfnResource.isCfnResource(x)
        && x.cfnResourceType == CfnBucket.CFN_RESOURCE_TYPE_NAME;
    };
    /** This predicate will tell us if an L2 Resource is a Bucket. */
    const isBucket = function isBucket(x: IConstruct): x is Bucket {
      return Resource.isResource(x)
        && x.node.defaultChild != undefined
        && isCfnBucket(x.node.defaultChild);
    };

    /**
     * ************************************************************
     * Create a bunch of resources so we have something to find.
     * ************************************************************
     */

    /**
     * An L2 bucket.
     * - It will have an L1 CfnBucket as it's first child.
     * - The Construct ID of the CfnBucket will be "Resource"
     * - You can also access that L1 by as bucket.node.defaultChild.
     */
    let l2bucket = new Bucket(this, 'MyBucket');
    let l1ForMyBucketL2 = l2bucket.node.defaultChild!;
    this.printAssertion('L2 MyBucket has defaultChild',
      l1ForMyBucketL2 != undefined);
    this.printAssertion('L1 bucket for the L2 MyBucket is child with ID \'Resource\'',
      l2bucket.node.tryFindChild('Resource') == l1ForMyBucketL2);
    this.printAssertion('l1ForMyBucketL2.node.scope == l2bucket',
      l1ForMyBucketL2.node.scope == l2bucket);
    this.printAssertion('isBucket(l2bucket)',
      isBucket(l2bucket));
    this.printAssertion('isCfnBucket(l1ForMyBucketL2)',
      isCfnBucket(l1ForMyBucketL2));
    this.printAssertion('isBucket for the stack should be false',
      isBucket(this));
    this.printAssertion('isCfnBucket for the stack should be false',
      isCfnBucket(this));

    /** All techniques from the slide. */
    let defaultChild = (l2bucket.node.defaultChild as CfnBucket);
    let resourceChild = (l2bucket.node.tryFindChild('Resource') as CfnBucket);
    let anarchy = ((l2bucket as any)._resource as CfnBucket);
    let searchResult = ConstructTreeSearch.for(isCfnBucket).searchDown(l2bucket).pop() as CfnBucket;
    if (defaultChild == resourceChild && resourceChild == anarchy && anarchy == searchResult) {
      searchResult.addMetadata('cirdan', 'shipwright');
    }

    /**
     * This L1 bucket won't have any children.
     */
    let l1Bucket = new CfnBucket(this, 'MyCfnBucket');
    this.printAssertion('l1Bucket has no children',
      l1Bucket.node.children.length == 0);
    this.printAssertion('isCfnBucket(l1Bucket)',
      isCfnBucket(l1Bucket));

    log.info(`Total number of constructs in app: ${constructSearch.searchDown(app).length}`);
    log.info(`Total number of constructs in stack: ${constructSearch.searchDown(this).length}`);

    /**
     * Create another L1 bucket.  This will be turned into an IBucket.
     */
    let otherCfnBucket = new CfnBucket(this, 'MyOtherCfnBucket');
    /**
     * `fromCfnBucket` creates a "frankenstein" L2 for an existing L1.  The defaultChild of the L2
     * is still the L1, but the L1 is the parent of the L2, which is the reverse of the normal
     * in the CDK.
     *
     * The CDK calls these "reverse escape hatches".
     */
    let frankensteinsBucket = Bucket.fromCfnBucket(otherCfnBucket);
    this.printAssertion('frankensteinsBucket default child is otherCfnBucket',
      frankensteinsBucket.node.defaultChild == otherCfnBucket);
    this.printAssertion('frankensteinsBucket parent is otherCfnBucket',
      frankensteinsBucket.node.scope == otherCfnBucket);

    log.info("** Now let's create some complex L3 constructs.");

    /**
     * HitlTestStepFunctionDefinition defines a state machine definition as a construct
     * by using the Chainable base class from cdk-orchestration.
     */
    const succeedStepFunction = new HitlTestStepFunctionDefinition(this, 'HitlStepFunctionDefinition', {
      successMode: true,
    });

    /**
     * StepFunction state machine using the above definition.
     */
    let hitlStateMachine = new StateMachine(this, 'HitlStateMachine', {
      definitionBody: DefinitionBody.fromChainable(succeedStepFunction),
    });
    /** StepFunctionTask can run StateMachines for up to 4 days. */
    new StepFunctionTask(this, 'RunHitlStateMachine', {
      stateMachine: hitlStateMachine,
    });

    /**
     * Similar to CDK Triggers, LambdaTask classes are custom resources that call a lambda.
     */
    new GreetingLambdaTask(this, 'GreetingLambdaTask', {
      greeting: 'Hello, everyone!',
    });

    /**
     * This Importer creates a StateMachine from a stepfunction definition created
     * by the [AWS Step Functions Data Science SDK for Python](
     * https://docs.aws.amazon.com/step-functions/latest/dg/concepts-python-sdk.html)
     * tool.
     *
     * This construct creates a CfnInclude, which is a CfnElement.
     */
    new ImportEchoInputStepFunction(this, 'PyStepFunctionsImport');

    new AwsCustomResource(this, 'MyS3FileResource', {
      onCreate: {
        service: 'S3',
        action: 'putObject',
        parameters: {
          Body: JSON.stringify({ dummy: 'data' }),
          Bucket: l2bucket.bucketName,
          Key: 'dummy.json',
        },
        physicalResourceId: PhysicalResourceId.of(`s3:://${l2bucket.bucketName}/dummy.json`),
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: [l2bucket.bucketArn, `${l2bucket.bucketArn}/*`],
      }),
    });

    /**
     * Let's use CfnElementUtilities to find resources and elements.
     *
     * CfnElementUtilities uses ConstructTreeSearch internally.
     */
    let resources = new CfnElementUtilities().cfnResources(this);
    this.printConstructs(
      'CfnResources in FindingConstructs stack.', resources);

    log.info(`Total number of constructs in app: ${constructSearch.searchDown(app).length}`);
    log.info(`Total number of constructs in stack: ${constructSearch.searchDown(this).length}`);

    /** Now let's find the L1 CfnBucket we created above. */
    let findL1Bucket = new CfnElementUtilities()
      .cfnResources(this, CfnBucket.CFN_RESOURCE_TYPE_NAME, x => x.node.id == 'MyCfnBucket');
    this.printConstructs('Found MyCfnBucket', findL1Bucket);

    /* Find the L1 construct for our LambdaTask custom resource. */
    let lambdaTasks = resources.filter(x => x.cfnResourceType == 'Custom::LambdaTask');
    this.printConstructs('Found Custom::LambdaTasks', lambdaTasks);

    /** Predicate to find stacks with a given region */
    const isStackForRegion = function isStackForRegion(region: string) {
      return (x: IConstruct ) => {
        return Stack.isStack(x) && x.region == region;
      };
    };

    /** Predicate to find stacks with a given account */
    const isStackForAccount = function isStackForAccount(account: string) {
      return (x: IConstruct ) => {
        return Stack.isStack(x) && x.account == account;
      };
    };

    const isChainable = function isChainable(x: IConstruct) {
      let asAny = x as any;
      return typeof asAny.id == 'string' && typeof asAny.startState == 'object'
        && Array.isArray(asAny.endStates);
    };
    const isState = function isState(x: IConstruct): x is State {
      let asAny = x as any;
      return isChainable(x) && typeof asAny.stateId == 'string';
    };

    /** Create a bunch of stacks and search for them. */
    new Stack(app, 'OneUsWest2', { env: { account: '000000000001', region: 'us-west-2' } });
    new Stack(app, 'OneUsEast1', { env: { account: '000000000001', region: 'us-east-1' } });
    new Stack(app, 'OneEuWestOne', { env: { account: '000000000001', region: 'eu-west-1' } });
    new Stack(app, 'TwoUsWest2', { env: { account: '000000000002', region: 'us-west-2' } });
    new Stack(app, 'TwoUsEast1', { env: { account: '000000000002', region: 'us-east-1' } });
    new Stack(app, 'TwoEuWestOne', { env: { account: '000000000002', region: 'eu-west-1' } });
    new Stack(app, 'ThreeEuWestOne', { env: { account: '000000000003', region: 'eu-west-1' } });
    let dubStacks = new StackUtilities().stacks(app, isStackForRegion('eu-west-1'));
    let twoStacks = ConstructTreeSearch.for(isStackForAccount('000000000002'));
    this.printConstructs('All stacks in region eu-west-1.', dubStacks);
    this.printConstructs('All stacks for account 000000000002.', twoStacks.searchDown(app));

    let isFrankenstein = function(elt: IConstruct) {
      return Resource.isResource(elt)
        && CfnResource.isCfnResource(elt.node.scope)
        && elt.node.defaultChild == elt.node.scope;
    };

    let elementSearch = ConstructTreeSearch.for(CfnElement.isCfnElement);
    let stackSearch = ConstructTreeSearch.for(Stack.isStack);
    let customResourceSearch = ConstructTreeSearch.for(CustomResourceUtilities.isCustomResource);
    let l2Search = ConstructTreeSearch.for(Resource.isResource);
    let frankensteinL2Search = ConstructTreeSearch.for(isFrankenstein);
    let chainableSearch = ConstructTreeSearch.for(isChainable);
    let statesSearch = ConstructTreeSearch.for(isState);
    this.printConstructs('Frankenstein constructs', frankensteinL2Search.searchDown(this));

    // Use searchSelfAndDescendents to search down the tree.
    log.info('Find all CfnElements in this stack');
    let elements = elementSearch.searchDown(this, Stack.isStack);
    log.info(`Number of CfnResources in the stack: ${resources.length}`);
    log.info(`Number of CfnElements in the stack: ${elements.length}`);

    /**
     * Note that the PyStepFunctionsImport creates a CfnInclude, so there is 1 CfnElement
     * in this stack that is NOT a CfnResource.
     */
    this.printConstructs('All CfnElements that are not resources',
      elements.filter(x => !(resources as IConstruct[]).includes(x)));
    this.printConstructs('All CfnInclude constructs in FindingConstructs stack.',
      ConstructTreeSearch.for(CfnIncludeToCdk.isCfnInclude).searchDown(this));

    /**
     * These constructs are neither L1, L2 nor L3.
     */
    this.printConstructs('StateMachine States in the stack', statesSearch.searchDown(this));
    this.printConstructs('Chainable in the stack', chainableSearch.searchDown(this));

    log.info(`Number of stacks in the app: ${stackSearch.searchDown(app).length}`);
    this.printConstructs('All stacks in the stack FindingConstructucts', stackSearch.searchDown(this));
    this.printConstructs('All custom resources in the app.', customResourceSearch.searchDown(app));

    let customResource = customResourceSearch.searchDown(app).pop();
    // Look up the tree to find an L2.
    if (customResource) {
      log.info(`Found L2 for custom resource ${
        customResource.node.path}: ` + l2Search.searchUp(customResource)?.node.path);
    }

    // Find the L1 bucket.
    let cfnBucket = elementSearch.searchDown(l2bucket).pop();
    if (cfnBucket) {
      // Can we find an L2 for this L1?
      log.info(`Found L2 Bucket for CfnBucket ${
        cfnBucket.node.path}: ` + l2Search.searchUp(cfnBucket)?.node.path);
    }

    /** Non-throwing version of Stack.of */
    let stack = stackSearch.searchUp(l2bucket);
    if (stack) {
      log.info(`Found stack for Bucket ${
        l2bucket.node.path}: ` + stack.node.path);
    }

    // SearchSelf to test a single construct.  Useful for RTTI.
    log.info('Is bucket a stack? ' + String(stackSearch.searchSelf(l2bucket) != undefined));
    log.info('Is stack a stack? ' + String(stackSearch.searchSelf(this) != undefined));

    log.info(`Total number of constructs in app: ${constructSearch.searchDown(app).length}`);
    log.info(`Total number of constructs in stack: ${constructSearch.searchDown(this).length}`);
  }

  printAssertion(purpose: string, value: boolean) {
    const log = Log.of(this);
    log.info(`${purpose}: ${value}`);
  }

  printConstructs(purpose: string, found: IConstruct[]) {
    const log = Log.of(this);
    log.info(`Results for ${purpose} (${found.length}):`);
    found.forEach(c => {
      if (CfnElement.isCfnElement(c) && CfnResource.isCfnResource(c)) {
        log.info(`  ${c.node.path} (${c.cfnResourceType})`);
      } else if (CfnElement.isCfnElement(c) ) {
        log.info(`  ${c.node.path} (CfnElement)`);
      } else {
        log.info(`  ${c.node.path}`);
      }
    });
  }
}

