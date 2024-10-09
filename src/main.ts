import { ServiceInspectorAspect } from '@michanto/cdk-orchestration';
import { App, Aspects } from 'aws-cdk-lib';
import { FindingConstructs } from './stacks/finding_constructs';

// For development, use account/region from cdk cli
// if not available, use dummy account/region for demo.
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT ?? '000000000000',
  region: process.env.CDK_DEFAULT_REGION ?? 'us-west-2',
};

const app = new App();
// Write symbol-keyed properties to tree.json.
Aspects.of(app).add(new ServiceInspectorAspect());


new FindingConstructs(app, 'FindingConstructs', { env: devEnv });

app.synth();