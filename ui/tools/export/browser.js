import * as esbuild from 'esbuild-wasm';
import { zipSync, strToU8 } from 'fflate';
import { compileProject, themeConfiguration } from '../../export/project.cjs';
import { mount as mountUI } from './export.js';

// Capture the URL synchronously while this classic generated script is executing.
const assets = new URL('.', document.currentScript.src);
let cachedProject, initialized;

async function loadProject({ signal }) {
  if (cachedProject) return cachedProject;
  if (location.protocol === 'file:') throw new Error('Open Templify through an HTTP server to use Export.');
  const response = await fetch(new URL('sources.json', assets), { signal });
  if (!response.ok) throw new Error('Source download failed (HTTP ' + response.status + ').');
  const project = await response.json();
  if (!project?.files || typeof project.files !== 'object') throw new Error('Invalid source package.');
  cachedProject = project;
  return project;
}

async function createArchive(project, components, { signal, onProgress, theme }) {
  signal.throwIfAborted();
  onProgress('Preparing the local JS / CSS compiler (first download may take a moment)…');
  if (!initialized) initialized = esbuild.initialize({ wasmURL: new URL('esbuild.wasm', assets).href })
    .catch(error => { initialized = null; throw error; });
  await initialized;
  signal.throwIfAborted();
  onProgress('Bundling selected components and their dependencies…');
  const result = await compileProject(project, components, esbuild.build, { theme });
  signal.throwIfAborted();
  onProgress('Creating ZIP…');
  const files = Object.fromEntries(Object.entries(result.files).map(([name, contents]) => [name, typeof contents === 'string' ? strToU8(contents) : contents]));
  return { data: zipSync(files, { level: 6 }), components: result.components };
}

export function mount(host, { themes } = {}) {
  return mountUI(host, {
    loadProject,
    createArchive(project, components, options) {
      return createArchive(project, components, {
        ...options,
        theme: themes ? themeConfiguration(themes) : undefined,
      });
    },
  });
}
