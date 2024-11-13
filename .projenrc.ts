import { awscdk } from 'projen';
import { TypeScriptModuleResolution } from 'projen/lib/javascript';
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.162.1',
  constructsVersion: '10.4.2',
  defaultReleaseBranch: 'main',
  name: 'cdk-orchestration-examples',
  buildCommand: 'tsc', // For InlineNodejsFunction support.
  projenrcTs: true,
  deps: [
    '@michanto/cdk-orchestration@^0.1.27',
    'esbuild@^0.21.5',
  ], /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  devDeps: [
  ],
  /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
  tsconfigDev: {
    compilerOptions: {
      module: 'nodenext',
      moduleResolution: TypeScriptModuleResolution.NODE_NEXT,
    },
  },
  tsconfig: {
    compilerOptions: {
      module: 'nodenext',
      moduleResolution: TypeScriptModuleResolution.NODE_NEXT,
    },
  },
  jestOptions: {
    jestConfig: {
      maxWorkers: 2,
    },
  },
});

project.synth();