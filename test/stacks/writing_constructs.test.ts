import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { WritingConstructs } from '../../src/stacks/writing_contructs';

test('WritingConstructs', () => {
  const app = new App();
  const stack = new WritingConstructs(app);

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();

});
