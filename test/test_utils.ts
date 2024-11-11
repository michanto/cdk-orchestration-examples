import { BUILD_TIME } from '@michanto/cdk-orchestration';
import { CfJsonType, StringReplacer, Transform } from '@michanto/cdk-orchestration/transforms';
import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class NormalizeEnsureChangeInStack extends Transform {
  constructor(scope: Construct, id: string) {
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

export class NormalizeSnapshot extends Construct {
  constructor(stack: Stack, id: string = 'NormalizeSnapshot') {
    super(stack, id);
    // EnsureChangeInStackB671AB8A and 1731294054943
    new StringReplacer(stack, 'Replacer', {
      splitter: BUILD_TIME.toString(), joiner: '1731294054943',
    });
    new NormalizeEnsureChangeInStack(stack, 'NormalizeEnsureChangeInStack');
  }
}
