import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { EscapeHatches } from '../../src/stacks/escape_hatches';

test('WritingConstructs', () => {
  const app = new App();
  const stack = new EscapeHatches(app);

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();

});
