import { createHash } from 'crypto';
import { BUILD_TIME, Singleton } from '@michanto/cdk-orchestration';
import { CfnIncludeToCdk } from '@michanto/cdk-orchestration/cloudformation-include';
import { CfnWaitConditionHandle } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Ensures that a stack will have a change.  On each build the logical ID of this
 * resource changes, ensuring that at least one new resource will be created, and thus
 * any metadata-only changes will deploy.
 */
export class EnsureChangeInStack extends CfnWaitConditionHandle {
  /**
   * Installs the EnsureChangeInStack construct as a singleton.
   * Thus only one change per stack.
   *
   * @param scope
   */
  static for(scope: Construct) {
    Singleton.create(scope, 'EnsureChangeInStack', (s, id) => new EnsureChangeInStack(s, id));
  }

  protected constructor(scope: Construct, id: string = 'EnsureChangeInStack') {
    super(scope, id);
    let hash = createHash('sha1')
      .update(BUILD_TIME.toString())
      .digest('hex')
      .substring(0, 8);
    CfnIncludeToCdk.setLogicalId(this, `${id}${hash.toUpperCase()}`);
  }
}