import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { TransformsIntro } from '../../src/stacks/transforms_intro';
import { NormalizeSnapshot } from '../test_utils';

test('WritingConstructs', () => {
  const app = new App();
  const stack = new TransformsIntro(app);
  new NormalizeSnapshot(stack);

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();

});
