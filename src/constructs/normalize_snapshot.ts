import { BUILD_TIME } from '@michanto/cdk-orchestration';
import { CfJsonType, StringReplacer, Transform } from '@michanto/cdk-orchestration/transforms';
import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * EnsureChangeInStack logicalId changes based on the BUILD_TIME constant.
 * Freeze it to a constant value.
 */
export class NormalizeEnsureChangeInStack extends Transform {
  constructor(scope: Construct, id: string = 'NormalizeEnsureChangeInStack') {
    super(scope, id);
  }

  apply(template: CfJsonType): CfJsonType {
    for (let res in template.Resources) {
      if (res.startsWith('EnsureChangeInStack')) {
        let value = template.Resources[res];
        delete template.Resources[res];
        // EnsureChangeInStackB671AB8A and 1731294054943
        template.Resources.EnsureChangeInStackB671AB8A = value;
      }
    }

    return template;
  }
}

/**
 * S3Key changes every time library code changes, including library updates.
 *
 * Freeze it to a constant value.
 */
export class NormalizeCodeS3Key extends Transform {
  constructor(scope: Construct, id: string = 'NormalizeCodeS3Key') {
    super(scope, id);
  }

  protected setS3KeyOfResource(template: CfJsonType, logicalId: string, s3Key: string) {
    if (template.Resources[logicalId]) {
      template.Resources[logicalId]
        .Properties.Code.S3Key = s3Key;
    }
  }

  apply(template: CfJsonType): CfJsonType {
    this.setS3KeyOfResource(template,
      'AWSCDKTriggerCustomResourceProviderCustomResourceProviderHandler97BECD91',
      'fe27a81f1e8702187a8717117fe7516f45948616ac25cefe80cc7e202365594b.zip');
    this.setS3KeyOfResource(template,
      'CDKORCHCUSTOMRESOURCEResourcesCDKORCHCUSTOMRESOURCEOnEventB60C9E76',
      '3aa61e21c6891872655937328a6920a8bb2146166790237d55e789931f75b60c.zip');
    this.setS3KeyOfResource(template,
      'CDKORCHCUSTOMRESOURCEResourcesCDKORCHCUSTOMRESOURCEProviderframeworkonEvent4AE15604',
      '4dc48ffba382f93077a1e6824599bbd4ceb6f91eb3d9442eca3b85bdb1a20b1e.zip');
    this.setS3KeyOfResource(template,
      'StepFunctionTaskStepResourcesStepFunctionTaskStepProviderframeworkonEvent9D2C3EB6',
      '4dc48ffba382f93077a1e6824599bbd4ceb6f91eb3d9442eca3b85bdb1a20b1e.zip');
    this.setS3KeyOfResource(template,
      'StepFunctionTaskStepResourcesStepFunctionTaskStepProviderframeworkonTimeoutB0C276CE',
      '4dc48ffba382f93077a1e6824599bbd4ceb6f91eb3d9442eca3b85bdb1a20b1e.zip');
    this.setS3KeyOfResource(template,
      'StepFunctionTaskStepResourcesStepFunctionTaskStepProviderframeworkisComplete48653344',
      '4dc48ffba382f93077a1e6824599bbd4ceb6f91eb3d9442eca3b85bdb1a20b1e.zip');
    return template;
  }
}

/**
 * Salt value changes every build to the new BUILD_TIME.
 *
 * Freeze it (and other uses of BUILD_TIME) to a constant value.
 */
export class NormalizeSalt extends StringReplacer {
  constructor(scope: Construct, id: string = 'NormalizeSalt') {
    super(scope, id, {
      splitter: BUILD_TIME.toString(), joiner: '1731294054943',
    });
  }
}

/**
 * Freeze values we expect to change in snapshots.  That way the snapshots won't change due to
 * expected changes.
 *
 * Freezing is done by Transforms.  Since there are no L1 resoruces under NormalizeSnapshot,
 * the Transforms are applied to the Stack.
 */
export class NormalizeSnapshot extends Construct {
  constructor(stack: Stack, id: string = 'NormalizeSnapshot') {
    super(stack, id);

    new NormalizeCodeS3Key(this);
    new NormalizeSalt(this);
    new NormalizeEnsureChangeInStack(this);
  }
}
