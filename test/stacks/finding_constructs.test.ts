import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { FindingConstructs } from '../../src/stacks/finding_constructs';
import { NormalizeSnapshot } from '../test_utils';

test('FindingConstructs', () => {
  const app = new App();
  const stack = new FindingConstructs(app);
  new NormalizeSnapshot(stack);

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});
