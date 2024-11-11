import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { StackProvenanceExample } from '../../src/stacks/stack_provenance';
import { NormalizeSnapshot } from '../test_utils';

test('StackProvenanceExample', () => {
  const app = new App();
  const stack = new StackProvenanceExample(app);
  new NormalizeSnapshot(stack);

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});
