import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { FindingConstructs01 } from '../src/stacks/finding_constructs_01';

test('Snapshot', () => {
  const app = new App();
  const stack = new FindingConstructs01(app, 'test');

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});