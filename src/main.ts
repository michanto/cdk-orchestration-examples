import { App } from 'aws-cdk-lib';
import { FindingConstructs01 } from './stacks/finding_constructs_01';

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new FindingConstructs01(app, 'cdk-orch-finding-constructs-dev', { env: devEnv });
// new FindingConstructs01(app, 'cdk-orch-finding-constructs-prod', { env: prodEnv });

app.synth();