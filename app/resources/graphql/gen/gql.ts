import * as types from './graphql';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
  'query ListNotes($fieldSelector: String) {\n  listCrmMiloapisComV1alpha1Note(fieldSelector: $fieldSelector) {\n    apiVersion\n    kind\n    items {\n      metadata {\n        name\n        creationTimestamp\n      }\n      spec {\n        followUp\n        content\n        interactionTime\n        nextAction\n        nextActionTime\n        subjectRef {\n          name\n          namespace\n          kind\n        }\n      }\n      status {\n        createdBy\n      }\n    }\n  }\n}\n\nquery ListFollowUpNotes($fieldSelector: String!) {\n  listCrmMiloapisComV1alpha1Note(fieldSelector: $fieldSelector) {\n    apiVersion\n    kind\n    items {\n      metadata {\n        name\n        creationTimestamp\n      }\n      spec {\n        followUp\n        nextActionTime\n        subjectRef {\n          name\n          namespace\n          kind\n        }\n      }\n      status {\n        createdBy\n      }\n    }\n  }\n}\n\nmutation CreateNote($input: com_miloapis_crm_v1alpha1_Note_Input!) {\n  createCrmMiloapisComV1alpha1Note(input: $input) {\n    apiVersion\n    kind\n    metadata {\n      name\n      generateName\n    }\n    spec {\n      followUp\n      content\n      interactionTime\n      nextAction\n      nextActionTime\n      subjectRef {\n        apiGroup\n        kind\n        name\n      }\n    }\n  }\n}\n\nmutation PatchNote($name: String!, $input: JSON!) {\n  patchCrmMiloapisComV1alpha1Note(name: $name, input: $input) {\n    apiVersion\n    kind\n    metadata {\n      name\n    }\n    spec {\n      followUp\n      content\n      interactionTime\n      nextAction\n      nextActionTime\n    }\n  }\n}': typeof types.ListNotesDocument;
};
const documents: Documents = {
  'query ListNotes($fieldSelector: String) {\n  listCrmMiloapisComV1alpha1Note(fieldSelector: $fieldSelector) {\n    apiVersion\n    kind\n    items {\n      metadata {\n        name\n        creationTimestamp\n      }\n      spec {\n        followUp\n        content\n        interactionTime\n        nextAction\n        nextActionTime\n        subjectRef {\n          name\n          namespace\n          kind\n        }\n      }\n      status {\n        createdBy\n      }\n    }\n  }\n}\n\nquery ListFollowUpNotes($fieldSelector: String!) {\n  listCrmMiloapisComV1alpha1Note(fieldSelector: $fieldSelector) {\n    apiVersion\n    kind\n    items {\n      metadata {\n        name\n        creationTimestamp\n      }\n      spec {\n        followUp\n        nextActionTime\n        subjectRef {\n          name\n          namespace\n          kind\n        }\n      }\n      status {\n        createdBy\n      }\n    }\n  }\n}\n\nmutation CreateNote($input: com_miloapis_crm_v1alpha1_Note_Input!) {\n  createCrmMiloapisComV1alpha1Note(input: $input) {\n    apiVersion\n    kind\n    metadata {\n      name\n      generateName\n    }\n    spec {\n      followUp\n      content\n      interactionTime\n      nextAction\n      nextActionTime\n      subjectRef {\n        apiGroup\n        kind\n        name\n      }\n    }\n  }\n}\n\nmutation PatchNote($name: String!, $input: JSON!) {\n  patchCrmMiloapisComV1alpha1Note(name: $name, input: $input) {\n    apiVersion\n    kind\n    metadata {\n      name\n    }\n    spec {\n      followUp\n      content\n      interactionTime\n      nextAction\n      nextActionTime\n    }\n  }\n}':
    types.ListNotesDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'query ListNotes($fieldSelector: String) {\n  listCrmMiloapisComV1alpha1Note(fieldSelector: $fieldSelector) {\n    apiVersion\n    kind\n    items {\n      metadata {\n        name\n        creationTimestamp\n      }\n      spec {\n        followUp\n        content\n        interactionTime\n        nextAction\n        nextActionTime\n        subjectRef {\n          name\n          namespace\n          kind\n        }\n      }\n      status {\n        createdBy\n      }\n    }\n  }\n}\n\nquery ListFollowUpNotes($fieldSelector: String!) {\n  listCrmMiloapisComV1alpha1Note(fieldSelector: $fieldSelector) {\n    apiVersion\n    kind\n    items {\n      metadata {\n        name\n        creationTimestamp\n      }\n      spec {\n        followUp\n        nextActionTime\n        subjectRef {\n          name\n          namespace\n          kind\n        }\n      }\n      status {\n        createdBy\n      }\n    }\n  }\n}\n\nmutation CreateNote($input: com_miloapis_crm_v1alpha1_Note_Input!) {\n  createCrmMiloapisComV1alpha1Note(input: $input) {\n    apiVersion\n    kind\n    metadata {\n      name\n      generateName\n    }\n    spec {\n      followUp\n      content\n      interactionTime\n      nextAction\n      nextActionTime\n      subjectRef {\n        apiGroup\n        kind\n        name\n      }\n    }\n  }\n}\n\nmutation PatchNote($name: String!, $input: JSON!) {\n  patchCrmMiloapisComV1alpha1Note(name: $name, input: $input) {\n    apiVersion\n    kind\n    metadata {\n      name\n    }\n    spec {\n      followUp\n      content\n      interactionTime\n      nextAction\n      nextActionTime\n    }\n  }\n}'
): typeof import('./graphql').ListNotesDocument;

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
