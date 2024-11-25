import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { NormalizeSnapshotExample } from '../../src/stacks/normalize_snapshot_example';

test('EscapeHatches', () => {
  const app = new App();
  const stack = new NormalizeSnapshotExample(app);
  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});
