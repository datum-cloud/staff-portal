import { PROXY_URL } from '@/modules/axios/axios.client';
import {
  createNotesMiloapisComV1Alpha1NamespacedNote,
  deleteNotesMiloapisComV1Alpha1NamespacedNote,
} from '@openapi/notes.miloapis.com/v1alpha1';

export const noteCreateMutation = async (
  projectName: string,
  namespace: string = 'default',
  domainName: string,
  content: string
) => {
  const response = await createNotesMiloapisComV1Alpha1NamespacedNote({
    baseURL: `${PROXY_URL}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane`,
    path: { namespace },
    body: {
      apiVersion: 'notes.miloapis.com/v1alpha1',
      kind: 'Note',
      metadata: {
        generateName: 'note-',
        namespace,
      },
      spec: {
        subjectRef: {
          apiGroup: 'networking.datumapis.com',
          kind: 'Domain',
          name: domainName,
          namespace,
        },
        content,
      },
    },
  });
  return response.data.data;
};

export const noteDeleteMutation = async (
  projectName: string,
  namespace: string = 'default',
  noteName: string
) => {
  return deleteNotesMiloapisComV1Alpha1NamespacedNote({
    baseURL: `${PROXY_URL}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane`,
    path: { namespace, name: noteName },
  });
};
