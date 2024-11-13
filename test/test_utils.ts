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

  apply(template: CfJsonType): CfJsonType {

    if (template.Resources.CDKORCHCUSTOMRESOURCEResourcesCDKORCHCUSTOMRESOURCEOnEventB60C9E76) {
      template.Resources.CDKORCHCUSTOMRESOURCEResourcesCDKORCHCUSTOMRESOURCEOnEventB60C9E76
        .Properties.Code.S3Key =
          '3aa61e21c6891872655937328a6920a8bb2146166790237d55e789931f75b60c.zip';
    }
    return template;
  }
}

/**
 * Salt value changes every build to the new BUILD_TIME.
 *
 * Freeze it to a constant value.
 */
export class NormalizeSalt extends StringReplacer {
  constructor(stack: Stack, id: string = 'NormalizeSalt') {
    super(stack, id, {
      splitter: BUILD_TIME.toString(), joiner: '1731294054943',
    });
  }
}

/**
 * Freeze values we expect to change in snapshots.  That way the snapshots won't change due to
 * expected changes.
 */
export class NormalizeSnapshot extends Construct {
  constructor(stack: Stack, id: string = 'NormalizeSnapshot') {
    super(stack, id);
    new NormalizeCodeS3Key(stack);
    new NormalizeSalt(stack);
    new NormalizeEnsureChangeInStack(stack);
  }
}
