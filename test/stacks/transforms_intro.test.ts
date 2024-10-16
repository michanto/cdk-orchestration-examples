import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { TransformsIntro } from '../../src/stacks/transforms_intro';

test('WritingConstructs', () => {
  const app = new App();
  const stack = new TransformsIntro(app);

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();

});
