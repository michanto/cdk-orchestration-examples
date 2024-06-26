import { CustomResourceUtilities } from '@michanto/cdk-orchestration/custom-resources';
import { Construct } from 'constructs';

export class RemoveSalt extends Construct {
  constructor(scope: Construct, id = 'RemoveSalt') {
    super(scope, id);
    let resource = new CustomResourceUtilities().findCustomResource(scope);
    resource.addPropertyDeletionOverride('salt');
  }
}
