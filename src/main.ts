import { ServiceInspectorAspect } from '@michanto/cdk-orchestration';
import { App, Aspects } from 'aws-cdk-lib';
import { EscapeHatches } from './stacks/escape_hatches';

// For development, use account/region from cdk cli
// if not available, use dummy account/region for demo.
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT ?? '000000000000',
  region: process.env.CDK_DEFAULT_REGION ?? 'us-west-2',
};

const app = new App();
// Write symbol-keyed properties to tree.json.
Aspects.of(app).add(new ServiceInspectorAspect());


new EscapeHatches(app, 'EscapeHatches', { env: devEnv });

app.synth();