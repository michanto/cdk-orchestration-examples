import { custom_resources } from '@michanto/cdk-orchestration';
import { Construct } from 'constructs';

export class RemoveSalt extends Construct {
  constructor(scope: Construct, id = 'RemoveSalt') {
    super(scope, id);
    let resource = new custom_resources.CustomResourceUtilities().findCustomResource(scope);
    resource.addPropertyDeletionOverride('salt');
  }
}
