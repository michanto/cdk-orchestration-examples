import { TemplateImporter } from '@michanto/cdk-orchestration/cloudformation-include';
import { CfTemplateType, StringReplacer, Transform } from '@michanto/cdk-orchestration/transforms';
import { RemovalPolicy } from 'aws-cdk-lib';
import { IRole, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { CfnStateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';

export class DescriptionRemover extends Transform {
  public apply(template: CfTemplateType): CfTemplateType {
    delete template.Description;
    return template;
  }
}

export interface PyStepFunctionsCleanupProps {
  /**
   * Desired logical id for the imported StateMachine.
   * The default logical id for PyStepFunction is 'StateMachineComponent',
   * but user can change it. */
  resourceLogicalId?: string;
  /** Optionally add a role. */
  role?: IRole;
}

/**
 * This transform takes a template created by the
 * [AWS Step Functions Data Science SDK for Python](
 * https://docs.aws.amazon.com/step-functions/latest/dg/concepts-python-sdk.html)
 * and modifies it for import into a CDK stack.
 */
export class PyStepFunctionsCleanup extends Transform {
  /** Default name for StepFunction created by Python SDK. */
  static readonly STATE_MACHINE_RESOURCE_ID = 'StateMachineComponent';

  readonly stepFunctionResourceName;
  constructor(scope: Construct, id: string, readonly props?: PyStepFunctionsCleanupProps) {
    super(scope, id);
    // If we don't delete this it gets put in the larger template.
    new DescriptionRemover(this, 'DescriptionRemover');
    // If the user desires a rename, add a StringReplacer transform to perform the rename.
    this.stepFunctionResourceName = props?.resourceLogicalId ?? PyStepFunctionsCleanup.STATE_MACHINE_RESOURCE_ID;
    if (props?.resourceLogicalId) {
      // Note that StringTransforms always run before Transforms,
      // unless the StringTransform.order is overridden.
      new StringReplacer(scope, 'Replacer', {
        joiner: props.resourceLogicalId,
        splitter: PyStepFunctionsCleanup.STATE_MACHINE_RESOURCE_ID,
      });
    }
  }

  apply(template: any) {
    let resource = template.Resources[this.stepFunctionResourceName];
    if (resource && this.props?.role) {
      resource.Properties.RoleArn =this.props!.role.roleArn;
    }
    return template;
  }
}

export interface PyStepFunctionsTemplateImportProps extends PyStepFunctionsCleanupProps {
  /** File to import */
  readonly templateFile: string;
  /** Optionally add a removal policy */
  readonly removalPolicy?: RemovalPolicy;
}

/**
 * Imports a template created by the
 * [AWS Step Functions Data Science SDK for Python](
 * https://docs.aws.amazon.com/step-functions/latest/dg/concepts-python-sdk.html)
 * into a CDK stack.
 *
 * Import multiple tempales into the stack by
 */
export class PyStepFunctionsTemplateImport extends Construct {
  readonly stateMachine: CfnStateMachine;

  constructor(scope: Construct, id: string, props?: PyStepFunctionsTemplateImportProps) {
    super(scope, id);
    let importer = new TemplateImporter(this, 'Importer');
    let cleanup = new PyStepFunctionsCleanup(importer, 'Cleanup', props);

    this.stateMachine = importer.importTemplate(templateFileName)
      .getResource(cleanup.stepFunctionResourceName) as CfnStateMachine;

    if (props?.removalPolicy) {
      this.stateMachine.applyRemovalPolicy(props?.removalPolicy);
    }
  }
}

const templateFileName = `${__dirname}/workflow_template.yaml`;

export class PyStepFunctionsImport extends Construct {
  readonly import: PyStepFunctionsTemplateImport;
  constructor(scope: Construct, id: string, templateFile: string = templateFileName) {
    super(scope, id);

    let role = new Role(this, 'SFRole', {
      assumedBy: new ServicePrincipal('states.amazonaws.com'),
    });

    this.import = new PyStepFunctionsTemplateImport(this, 'ImportPyStepFunction', {
      templateFile: templateFile,
      role: role,
    });
  }
}