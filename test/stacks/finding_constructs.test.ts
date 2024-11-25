import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { NormalizeSnapshot } from '../../src/constructs/normalize_snapshot';
import { FindingConstructs } from '../../src/stacks/finding_constructs';

test('FindingConstructs', () => {
  const app = new App();
  const stack = new FindingConstructs(app);
  new NormalizeSnapshot(stack);

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});
