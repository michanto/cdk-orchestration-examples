import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { NormalizeSnapshot } from '../../src/constructs/normalize_snapshot';
import { EscapeHatches } from '../../src/stacks/escape_hatches';

test('EscapeHatches', () => {
  const app = new App();
  const stack = new EscapeHatches(app);
  new NormalizeSnapshot(stack);
  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});
