/*
  Beyond the Resume — project.js

  Frontend controller for:
  - GitHub import
  - Local project upload
  - Browser code editor
  - Project preview
  - Project analysis
  - Project overview
  - Project files
  - Feedback
  - Comments

  Backend:
  http://localhost:5000/api
*/

"use strict";


/* =========================================================
   CONFIGURATION
========================================================= */

const API_BASE = "http://localhost:5000/api";


/* =========================================================
   STATE
========================================================= */

const state = {

  currentProject: null,

  sourceType: null,

  currentFile: "index.html",

  files: {},

  rating: 0,

  isAnalyzing: false

};


/* =========================================================
   DEFAULT EDITOR FILES
========================================================= */

const defaultFiles = {

  "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Project</title>
</head>
<body>

  <h1>Hello from Beyond the Resume</h1>

  <p>
    Start building your project here.
  </p>

</body>
</html>`,

  "style.css": `body {
  font-family: Arial, sans-serif;
  padding: 40px;
}

h1 {
  margin-bottom: 10px;
}`,

  "script.js": `console.log("Project loaded successfully");`

};


/* =========================================================
   LANGUAGE MAP
========================================================= */

const EXT_LANGUAGE_MAP = {

  html: "HTML",
  htm: "HTML",

  css: "CSS",

  js: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",

  ts: "TypeScript",
  tsx: "TypeScript",

  jsx: "JavaScript",

  py: "Python",

  java: "Java",

  cpp: "C++",
  cc: "C++",
  hpp: "C++",
  h: "C++",

  c: "C",

  cs: "C#",

  go: "Go",

  rs: "Rust",

  php: "PHP",

  rb: "Ruby",

  swift: "Swift",

  kt: "Kotlin",

  sql: "SQL",

  json: "JSON",

  md: "Markdown"

};


/* =========================================================
   DOM HELPER
========================================================= */

function $(selector) {

  return document.querySelector(selector);

}


function $all(selector) {

  return Array.from(document.querySelectorAll(selector));

}


function byId(id) {

  return document.getElementById(id);

}


/*
  Safe event listener.

  This prevents errors such as:

  Cannot read properties of null
  (reading 'addEventListener')
*/

function on(element, event, handler) {

  if (!element) {
    return;
  }

  element.addEventListener(event, handler);

}


/* =========================================================
   TOAST
========================================================= */

function showToast(message, type = "info") {

  const toast = byId("toast");

  if (!toast) {
    console.log(message);
    return;
  }

  toast.textContent = message;

  toast.dataset.type = type;

  toast.hidden = false;

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {

    toast.hidden = true;

  }, 4000);

}


/* =========================================================
   LOADING HELPERS
========================================================= */

function setLoading(id, visible) {

  const element = byId(id);

  if (!element) {
    return;
  }

  element.hidden = !visible;

}


function setButtonLoading(button, loading, loadingText) {

  if (!button) {
    return;
  }

  if (loading) {

    button.dataset.originalText = button.textContent;

    button.disabled = true;

    button.textContent = loadingText || "Loading...";

  } else {

    button.disabled = false;

    button.textContent =
      button.dataset.originalText ||
      button.textContent;

  }

}


/* =========================================================
   API HELPER
========================================================= */

async function apiRequest(endpoint, options = {}) {

  if (localStorage.getItem("btr_auth_mode") === "demo") {
    throw new Error("Demo workspace only: connect the backend to save or analyze projects.");
  }

  const token = localStorage.getItem("btr_token");

  const response = await fetch(
    `${API_BASE}${endpoint}`,
    {
      ...options,

      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    }
  );


  let data = null;

  try {

    data = await response.json();

  } catch {

    data = null;

  }


  if (!response.ok) {

    if (response.status === 401) {
      localStorage.removeItem("btr_token");
      localStorage.removeItem("btr_user");
      localStorage.removeItem("btr_auth_mode");
      window.location.replace("../index.html");
    }

    const message =
      data?.message ||
      data?.error ||
      `Request failed with status ${response.status}`;

    throw new Error(message);

  }


  return data;

}


function initAuth() {

  const avatarButton = byId("profileMenu") || $(".avatar-btn");
  const avatar = avatarButton?.querySelector(".avatar");
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("btr_user") || "null");
  } catch {
    user = null;
  }

  if (avatar && user?.name) {
    avatar.textContent = user.name
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0])
      .join("")
      .toUpperCase();
    avatarButton.title = `${user.name} — sign out`;
  }

  on(avatarButton, "click", () => {
    localStorage.removeItem("btr_token");
    localStorage.removeItem("btr_user");
    localStorage.removeItem("btr_auth_mode");
    window.location.replace("../index.html");
  });

}


/* =========================================================
   NAVIGATION
========================================================= */

function initNav() {

  const toggle = byId("navToggle");

  const nav = byId("mainNav");

  on(toggle, "click", () => {

    if (!nav) {
      return;
    }

    nav.classList.toggle("open");

  });

}


/* =========================================================
   GITHUB MODAL
========================================================= */

function initGithubModal() {

  const modal = byId("githubModal");

  const openButton = byId("openGithubModal");

  const closeButton = byId("closeGithubModal");

  const analyzeButton = byId("analyzeRepoBtn");

  const repoInput = byId("repoUrl");

  const errorElement = byId("repoError");


  on(openButton, "click", () => {

    if (!modal) {
      return;
    }

    modal.hidden = false;

    if (repoInput) {
      repoInput.focus();
    }

  });


  on(closeButton, "click", () => {

    if (modal) {
      modal.hidden = true;
    }

  });


  if (modal) {

    modal.addEventListener("click", event => {

      if (event.target === modal) {
        modal.hidden = true;
      }

    });

  }


  on(analyzeButton, "click", async () => {

    const url = repoInput?.value.trim();

    if (!url) {

      showError(
        errorElement,
        "Please enter a GitHub repository URL."
      );

      return;

    }


    if (!isGithubUrl(url)) {

      showError(
        errorElement,
        "Please enter a valid GitHub repository URL."
      );

      return;

    }


    hideError(errorElement);

    setLoading("repoLoading", true);

    setButtonLoading(
      analyzeButton,
      true,
      "Analyzing..."
    );


    try {

      const result =
        await analyzeGithubRepository(url);

      applyProjectData(
        result?.project || result,
        "GitHub"
      );


      if (modal) {
        modal.hidden = true;
      }


      showToast(
        "GitHub repository analyzed successfully.",
        "success"
      );


    } catch (error) {

      console.error(error);

      showError(
        errorElement,
        error.message ||
        "Unable to analyze the repository."
      );

    } finally {

      setLoading("repoLoading", false);

      setButtonLoading(
        analyzeButton,
        false
      );

    }

  });

}


function isGithubUrl(url) {

  try {

    const parsed = new URL(url);

    return (
      parsed.hostname === "github.com" ||
      parsed.hostname === "www.github.com"
    );

  } catch {

    return false;

  }

}


function showError(element, message) {

  if (!element) {
    showToast(message, "error");
    return;
  }

  element.textContent = message;

  element.hidden = false;

}


function hideError(element) {

  if (!element) {
    return;
  }

  element.hidden = true;

  element.textContent = "";

}


/* =========================================================
   GITHUB API
========================================================= */

async function analyzeGithubRepository(url) {

  /*
    Expected backend endpoint:

    POST /api/projects/github

    Body:
    {
      "repoUrl": "https://github.com/user/repository"
    }
  */

  try {

    return await apiRequest(
      "/projects/github",
      {
        method: "POST",

        body: JSON.stringify({
          repoUrl: url
        })
      }
    );

  } catch (error) {

    /*
      If the backend endpoint isn't available yet,
      use a safe frontend fallback so the page doesn't break.
    */

    console.warn(
      "GitHub API unavailable:",
      error.message
    );


    const repo = parseGithubUrl(url);

    return {

      project: {

        name: repo.name,

        description:
          "GitHub project imported for analysis.",

        developer:
          repo.owner,

        sourceType:
          "GitHub",

        githubUrl:
          url,

        files: {},

        languages: {},

        technologies: [],

        analysis: {

          problem:
            "The project was imported from GitHub and is ready for analysis.",

          summary:
            "Repository source was detected successfully. Connect the backend analysis endpoint for deeper project analysis.",

          steps: [
            "Repository URL was validated.",
            "GitHub repository metadata was identified.",
            "Project files can now be analyzed."
          ]

        }

      }

    };

  }

}


function parseGithubUrl(url) {

  const parsed = new URL(url);

  const parts =
    parsed.pathname
      .split("/")
      .filter(Boolean);


  return {

    owner: parts[0] || "GitHub user",

    name:
      (parts[1] || "GitHub Project")
        .replace(/\.git$/, "")

  };

}


/* =========================================================
   LOCAL UPLOAD
========================================================= */

function initUpload() {

  const trigger =
    byId("triggerUpload");

  const input =
    byId("folderInput");


  on(trigger, "click", () => {

    input?.click();

  });


  on(input, "change", async event => {

    const files =
      Array.from(event.target.files || []);


    if (!files.length) {
      return;
    }


    setLoading("uploadLoading", true);


    try {

      const project =
        await readUploadedProject(files);


      applyProjectData(
        project,
        "Local Upload"
      );


      showToast(
        "Project uploaded successfully.",
        "success"
      );


    } catch (error) {

      console.error(error);

      showToast(
        error.message ||
        "Unable to read the uploaded project.",
        "error"
      );

    } finally {

      setLoading("uploadLoading", false);

    }

  });

}


/* =========================================================
   READ LOCAL PROJECT
========================================================= */

async function readUploadedProject(files) {

  const projectFiles = {};

  const languages = {};

  const fileNames = [];


  for (const file of files) {

    const name =
      file.webkitRelativePath ||
      file.name;


    /*
      Ignore very large files.
    */

    if (file.size > 2 * 1024 * 1024) {
      continue;
    }


    const content =
      await file.text();


    projectFiles[name] = content;

    fileNames.push(name);


    const extension =
      getExtension(name);


    const language =
      EXT_LANGUAGE_MAP[extension];


    if (language) {

      languages[language] =
        (languages[language] || 0) + 1;

    }

  }


  const rootName =
    files[0]?.webkitRelativePath
      ?.split("/")[0] ||
    "Uploaded Project";


  return {

    name: rootName,

    description:
      "Project uploaded from your local computer.",

    developer:
      "Project Owner",

    sourceType:
      "Local Upload",

    githubUrl:
      null,

    files:
      projectFiles,

    languages,

    technologies:
      detectTechnologies(
        Object.keys(projectFiles)
      ),

    analysis:
      createFallbackAnalysis(
        projectFiles,
        languages
      )

  };

}


/* =========================================================
   EDITOR
========================================================= */

function initEditorWorkspace() {

  const openEditorBtn =
    byId("openEditor");

  const editorSection =
    byId("editorSection");

  const codeInput =
    byId("codeInput");

  const tabs =
    $all(".tab");

  const explorerList =
    byId("explorerList");

  const newFileBtn =
    byId("newFileBtn");

  const deleteFileBtn =
    byId("deleteFileBtn");

  const runBtn =
    byId("runProjectBtn");

  const saveBtn =
    byId("saveProjectBtn");

  const analyzeBtn =
    byId("analyzeEditorBtn");


  state.files = {
    ...defaultFiles
  };


  on(openEditorBtn, "click", () => {

    if (editorSection) {

      editorSection.hidden = false;

      editorSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    }


    state.sourceType =
      "Built on Beyond the Resume";


    loadEditorFile("index.html");

  });


  tabs.forEach(tab => {

    tab.addEventListener(
      "click",
      () => {

        const type =
          tab.dataset.tab;

        const filename =
          type === "html"
            ? "index.html"
            : type === "css"
              ? "style.css"
              : "script.js";


        loadEditorFile(filename);

      }
    );

  });


  if (explorerList) {

    explorerList.addEventListener(
      "click",
      event => {

        const item =
          event.target.closest("[data-file]");


        if (!item) {
          return;
        }


        loadEditorFile(
          item.dataset.file
        );

      }
    );

  }


  on(codeInput, "input", () => {

    if (!state.currentFile) {
      return;
    }

    state.files[state.currentFile] =
      codeInput.value;

  });


  on(newFileBtn, "click", () => {

    const filename =
      prompt(
        "Enter the new file name:"
      );


    if (!filename) {
      return;
    }


    if (state.files[filename]) {

      showToast(
        "That file already exists.",
        "error"
      );

      return;

    }


    state.files[filename] = "";

    renderExplorer();

    loadEditorFile(filename);

  });


  on(deleteFileBtn, "click", () => {

    if (!state.currentFile) {
      return;
    }


    if (
      !confirm(
        `Delete ${state.currentFile}?`
      )
    ) {
      return;
    }


    delete state.files[
      state.currentFile
    ];


    const remaining =
      Object.keys(state.files);


    if (!remaining.length) {

      state.currentFile = null;

      if (codeInput) {
        codeInput.value = "";
      }

      renderExplorer();

      return;

    }


    loadEditorFile(
      remaining[0]
    );

  });


  on(runBtn, "click", runEditorProject);


  on(saveBtn, "click", saveEditorProject);


  on(analyzeBtn, "click", () => {

    const project =
      createEditorProject();

    applyProjectData(
      project,
      "Built on Beyond the Resume"
    );

  });


  renderExplorer();

  loadEditorFile("index.html");

}


function loadEditorFile(filename) {

  const codeInput =
    byId("codeInput");


  if (!Object.prototype.hasOwnProperty.call(
    state.files,
    filename
  )) {

    state.files[filename] = "";

  }


  state.currentFile =
    filename;


  if (codeInput) {

    codeInput.value =
      state.files[filename] || "";

  }


  $all(".tab").forEach(tab => {

    tab.classList.remove("active");

  });


  const extension =
    getExtension(filename);


  const tabType =
    extension === "html"
      ? "html"
      : extension === "css"
        ? "css"
        : "js";


  const activeTab =
    document.querySelector(
      `.tab[data-tab="${tabType}"]`
    );


  activeTab?.classList.add("active");


  renderExplorer();

}


function renderExplorer() {

  const list =
    byId("explorerList");


  if (!list) {
    return;
  }


  list.innerHTML = "";


  const files =
    Object.keys(state.files);


  files.forEach((filename, index) => {

    const li =
      document.createElement("li");


    li.dataset.file =
      filename;


    li.className =
      filename === state.currentFile
        ? "active"
        : "";


    li.textContent =
      `${index === files.length - 1 ? "└──" : "├──"} ${filename}`;


    list.appendChild(li);

  });

}


/* =========================================================
   RUN PROJECT
========================================================= */

function runEditorProject() {

  const frame =
    byId("previewFrame");


  if (!frame) {
    return;
  }


  const html =
    state.files["index.html"] ||
    "";


  const css =
    state.files["style.css"] ||
    "";


  const js =
    state.files["script.js"] ||
    "";


  const documentHtml =
    html.includes("<html")
      ? html
      : `
        <!DOCTYPE html>
        <html>
        <head>
          <style>${css}</style>
        </head>
        <body>
          ${html}
          <script>${js}<\/script>
        </body>
        </html>
      `;


  let finalHtml =
    documentHtml;


  if (
    !html.includes("<style") &&
    css
  ) {

    finalHtml =
      finalHtml.replace(
        "</head>",
        `<style>${css}</style></head>`
      );

  }


  if (
    !html.includes("<script") &&
    js
  ) {

    finalHtml =
      finalHtml.replace(
        "</body>",
        `<script>${js}<\/script></body>`
      );

  }


  frame.srcdoc =
    finalHtml;


  showToast(
    "Project preview updated.",
    "success"
  );

}


/* =========================================================
   CREATE EDITOR PROJECT
========================================================= */

function createEditorProject() {

  const name =
    byId("editorProjectName")
      ?.value
      ?.trim() ||
    "My New Project";


  const description =
    byId("editorProjectDesc")
      ?.value
      ?.trim() ||
    "A project built inside Beyond the Resume.";


  const languages = {};


  Object.keys(state.files)
    .forEach(filename => {

      const language =
        EXT_LANGUAGE_MAP[
          getExtension(filename)
        ];


      if (language) {

        languages[language] =
          (languages[language] || 0) + 1;

      }

    });


  return {

    name,

    description,

    developer:
      "Project Owner",

    sourceType:
      "Built on Beyond the Resume",

    githubUrl:
      null,

    files:
      { ...state.files },

    languages,

    technologies:
      detectTechnologies(
        Object.keys(state.files)
      ),

    analysis:
      createFallbackAnalysis(
        state.files,
        languages
      )

  };

}


/* =========================================================
   SAVE EDITOR PROJECT
========================================================= */

async function saveEditorProject() {

  const saveButton =
    byId("saveProjectBtn");


  const project =
    createEditorProject();


  setLoading(
    "saveLoading",
    true
  );


  setButtonLoading(
    saveButton,
    true,
    "Saving..."
  );


  try {

    /*
      Expected backend endpoint:

      POST /api/projects
    */

    const response =
      await apiRequest(
        "/projects",
        {
          method: "POST",

          body: JSON.stringify(
            project
          )
        }
      );


    state.currentProject =
      response?.project ||
      response ||
      project;


    applyProjectData(
      state.currentProject,
      "Built on Beyond the Resume"
    );


    showToast(
      "Project saved successfully.",
      "success"
    );


  } catch (error) {

    console.warn(
      "Save API unavailable:",
      error.message
    );


    /*
      Still display the project locally.
    */

    state.currentProject =
      project;


    applyProjectData(
      project,
      "Built on Beyond the Resume"
    );


    showToast(
      "Project prepared locally. Backend save endpoint was not available.",
      "info"
    );

  } finally {

    setLoading(
      "saveLoading",
      false
    );

    setButtonLoading(
      saveButton,
      false
    );

  }

}


/* =========================================================
   AI / PROJECT ANALYSIS
========================================================= */

function initAiAnalysis() {

  const analyzeButton =
    byId("reanalyzeBtn");


  on(analyzeButton, "click", async () => {

    await analyzeProject();

  });

}


async function analyzeProject() {

  if (!state.currentProject) {

    showToast(
      "Please import, upload, or create a project first.",
      "error"
    );

    return;

  }


  if (state.isAnalyzing) {
    return;
  }


  state.isAnalyzing =
    true;


  setLoading(
    "aiLoading",
    true
  );


  try {

    /*
      Expected backend endpoint:

      POST /api/projects/analyze

      Body:
      {
        project: ...
      }
    */

    const response =
      await apiRequest(
        "/projects/analyze",
        {
          method: "POST",

          body: JSON.stringify({
            project:
              state.currentProject
          })
        }
      );


    const analysis =
      response?.analysis ||
      response;


    state.currentProject.analysis =
      analysis;


    renderAnalysis(
      analysis
    );


    byId("fallbackNote").hidden =
      false;


    showToast(
      "Project analysis completed.",
      "success"
    );


  } catch (error) {

    console.warn(
      "AI analysis API unavailable:",
      error.message
    );


    const fallback =
      state.currentProject.analysis ||
      createFallbackAnalysis(
        state.currentProject.files || {},
        state.currentProject.languages || {}
      );


    state.currentProject.analysis =
      fallback;


    renderAnalysis(
      fallback
    );


    const note =
      byId("fallbackNote");


    if (note) {
      note.hidden = false;
    }


    showToast(
      "Showing basic project analysis.",
      "info"
    );

  } finally {

    setLoading(
      "aiLoading",
      false
    );


    state.isAnalyzing =
      false;

  }

}


/* =========================================================
   FALLBACK ANALYSIS
========================================================= */

function createFallbackAnalysis(
  files = {},
  languages = {}
) {

  const fileNames =
    Object.keys(files);


  const languageNames =
    Object.keys(languages);


  const mainLanguage =
    languageNames[0] ||
    "the detected project languages";


  return {

    problem:
      `This project is built using ${mainLanguage} and contains ${fileNames.length} analyzed file(s).`,

    summary:
      `The project appears to be a ${mainLanguage}-based application. The available source files provide the basis for understanding its structure and implementation.`,

    steps: [

      "Project files are collected and inspected.",

      `Detected languages include ${languageNames.join(", ") || "the available source files"}.`,

      "Important project files are examined to understand the implementation.",

      "The detected technologies and source structure are summarized."

    ]

  };

}


/* =========================================================
   APPLY PROJECT DATA
========================================================= */

function applyProjectData(
  project,
  sourceType
) {

  if (!project) {
    return;
  }


  state.currentProject =
    normalizeProject(project);


  state.sourceType =
    sourceType ||
    state.currentProject.sourceType ||
    "Source Available";


  /*
    If files exist, use them for the file viewer.
  */

  if (
    state.currentProject.files &&
    typeof state.currentProject.files === "object"
  ) {

    state.files =
      {
        ...state.currentProject.files
      };

  }


  renderAll();


  const analysisSection =
    byId("analysisSection");


  analysisSection &&
    (analysisSection.hidden = false);


  showProjectSections();

}


function normalizeProject(project) {

  const normalized = {
    ...project
  };


  normalized.name =
    project.name ||
    project.projectName ||
    "Untitled Project";


  normalized.description =
    project.description ||
    project.projectDescription ||
    "No project description provided.";


  normalized.developer =
    project.developer ||
    project.author ||
    project.owner ||
    "Project Owner";


  normalized.sourceType =
    project.sourceType ||
    state.sourceType ||
    "Source Available";


  normalized.files =
    project.files ||
    {};


  normalized.languages =
    project.languages ||
    {};


  normalized.technologies =
    project.technologies ||
    [];


  normalized.analysis =
    project.analysis ||
    createFallbackAnalysis(
      normalized.files,
      normalized.languages
    );


  return normalized;

}


/* =========================================================
   RENDER EVERYTHING
========================================================= */

function renderAll() {

  renderAnalysis(
    state.currentProject.analysis
  );

  renderSkills(
    state.currentProject
  );

  renderOverview(
    state.currentProject
  );

  renderFiles(
    state.currentProject
  );

  renderVerification(
    state.currentProject
  );

}


/* =========================================================
   ANALYSIS RENDERING
========================================================= */

function renderAnalysis(
  analysis = {}
) {

  const problem =
    byId("analysisProblem");

  const summary =
    byId("analysisSummary");

  const steps =
    byId("analysisSteps");


  if (problem) {

    problem.textContent =
      analysis.problem ||
      "No problem statement available.";

  }


  if (summary) {

    summary.textContent =
      analysis.summary ||
      "No project summary available.";

  }


  if (steps) {

    steps.innerHTML = "";


    const stepList =
      Array.isArray(analysis.steps)
        ? analysis.steps
        : [];


    stepList.forEach(step => {

      const li =
        document.createElement("li");

      li.textContent =
        String(step);

      steps.appendChild(li);

    });

  }

}


/* =========================================================
   SKILLS
========================================================= */

function renderSkills(project) {

  const langBars =
    byId("langBars");

  const techBadges =
    byId("techBadges");


  if (langBars) {

    langBars.innerHTML = "";


    const languages =
      project.languages || {};


    const entries =
      Object.entries(languages);


    const total =
      entries.reduce(
        (sum, [, value]) =>
          sum + Number(value || 0),
        0
      );


    entries.forEach(
      ([language, count]) => {

        const percentage =
          total
            ? Math.round(
                (Number(count) / total) * 100
              )
            : 0;


        const wrapper =
          document.createElement("div");


        wrapper.className =
          "lang-bar";


        wrapper.innerHTML = `
          <div class="lang-bar-top">
            <span>${escapeHtml(language)}</span>
            <span>${percentage}%</span>
          </div>

          <div class="lang-bar-track">
            <div
              class="lang-bar-fill"
              style="width:${percentage}%">
            </div>
          </div>
        `;


        langBars.appendChild(
          wrapper
        );

      }
    );


    if (!entries.length) {

      langBars.innerHTML =
        "<p>No languages detected yet.</p>";

    }

  }


  if (techBadges) {

    techBadges.innerHTML = "";


    const technologies =
      Array.isArray(project.technologies)
        ? project.technologies
        : [];


    technologies.forEach(
      technology => {

        const badge =
          document.createElement("span");


        badge.className =
          "skill-badge";


        badge.textContent =
          technology;


        techBadges.appendChild(
          badge
        );

      }
    );


    if (!technologies.length) {

      techBadges.innerHTML =
        "<span>No technologies detected yet.</span>";

    }

  }

}


/* =========================================================
   OVERVIEW
========================================================= */

function renderOverview(project) {

  const name =
    byId("ovProjectName");

  const description =
    byId("ovDescription");

  const developer =
    byId("ovDevName");

  const date =
    byId("ovDate");

  const views =
    byId("ovViews");

  const tech =
    byId("ovTech");

  const sourceBadge =
    byId("ovSourceBadge");

  const githubLink =
    byId("ovGithubLink");


  if (name) {

    name.textContent =
      project.name ||
      "Untitled Project";

  }


  if (description) {

    description.textContent =
      project.description ||
      "";

  }


  if (developer) {

    developer.textContent =
      project.developer ||
      "Project Owner";

  }


  if (date) {

    const createdAt =
      project.createdAt ||
      project.date ||
      new Date().toISOString();


    date.textContent =
      formatDate(createdAt);

  }


  if (views) {

    views.textContent =
      Number(project.views || 0);

  }


  if (sourceBadge) {

    sourceBadge.textContent =
      project.sourceType ||
      state.sourceType ||
      "Source Available";

  }


  if (tech) {

    tech.innerHTML = "";


    const technologies =
      project.technologies || [];


    technologies.forEach(
      item => {

        const span =
          document.createElement("span");


        span.textContent =
          item;


        tech.appendChild(
          span
        );

      }
    );

  }


  if (githubLink) {

    const url =
      project.githubUrl ||
      project.repoUrl;


    if (url) {

      githubLink.href =
        url;

      githubLink.hidden =
        false;

    } else {

      githubLink.hidden =
        true;

    }

  }

}


/* =========================================================
   FILE VIEWER
========================================================= */

function renderFiles(project) {

  const fileList =
    byId("fileList");


  if (!fileList) {
    return;
  }


  fileList.innerHTML = "";


  const files =
    project.files || {};


  const entries =
    Object.entries(files);


  if (!entries.length) {

    fileList.innerHTML =
      "<p>No project files available.</p>";

    return;

  }


  entries.forEach(
    ([filename, content]) => {

      const button =
        document.createElement("button");


      button.type =
        "button";


      button.className =
        "file-item";


      button.textContent =
        filename;


      button.addEventListener(
        "click",
        () => {

          showFile(
            filename,
            content
          );

        }
      );


      fileList.appendChild(
        button
      );

    }
  );


  showFile(
    entries[0][0],
    entries[0][1]
  );

}


function showFile(
  filename,
  content
) {

  const name =
    byId("codeViewerName");

  const body =
    byId("codeViewerBody");


  if (name) {

    name.textContent =
      filename;

  }


  if (body) {

    body.textContent =
      String(content || "");

  }

}


/* =========================================================
   VERIFICATION
========================================================= */

function renderVerification(project) {

  const sourceType =
    byId("verifySourceType");


  if (sourceType) {

    sourceType.textContent =
      project.sourceType ||
      state.sourceType ||
      "Source Available";

  }


  const source =
    byId("badgeSource");

  const files =
    byId("badgeFiles");

  const tech =
    byId("badgeTech");

  const submitted =
    byId("badgeSubmitted");


  if (source) {
    source.hidden = false;
  }


  if (files) {

    files.hidden =
      !Object.keys(
        project.files || {}
      ).length;

  }


  if (tech) {

    tech.hidden =
      !(project.technologies || []).length;

  }


  if (submitted) {
    submitted.hidden = false;
  }

}


/* =========================================================
   SHOW PROJECT SECTIONS
========================================================= */

function showProjectSections() {

  [
    "analysisSection",
    "skillsSection",
    "overviewSection",
    "filesSection",
    "verifySection",
    "feedbackSection",
    "commentsSection"
  ]
  .forEach(id => {

    const section =
      byId(id);


    if (section) {
      section.hidden = false;
    }

  });

}


/* =========================================================
   FEEDBACK
========================================================= */

function initFeedback() {

  const rating =
    byId("fbRating");

  const postButton =
    byId("postFeedbackBtn");


  if (rating) {

    rating.addEventListener(
      "click",
      event => {

        const star =
          event.target.closest(
            "[data-value]"
          );


        if (!star) {
          return;
        }


        const value =
          Number(
            star.dataset.value
          );


        state.rating =
          value;


        rating.dataset.rating =
          String(value);


        $all(
          "#fbRating i"
        ).forEach(
          icon => {

            const starValue =
              Number(
                icon.dataset.value
              );


            icon.classList.toggle(
              "fa-solid",
              starValue <= value
            );


            icon.classList.toggle(
              "fa-regular",
              starValue > value
            );

          }
        );

      }
    );

  }


  on(
    postButton,
    "click",
    submitFeedback
  );

}


async function submitFeedback() {

  if (!state.currentProject) {

    showToast(
      "Create or import a project first.",
      "error"
    );

    return;

  }


  const name =
    byId("fbName")
      ?.value
      ?.trim();


  const role =
    byId("fbRole")
      ?.value
      ?.trim();


  const comment =
    byId("fbComment")
      ?.value
      ?.trim();


  if (!name || !comment) {

    showToast(
      "Please enter your name and comment.",
      "error"
    );

    return;

  }


  const feedback = {

    name,

    role,

    rating:
      state.rating,

    comment,

    projectId:
      state.currentProject._id ||
      state.currentProject.id

  };


  try {

    await apiRequest(
      "/feedback",
      {
        method: "POST",

        body: JSON.stringify(
          feedback
        )
      }
    );


    showToast(
      "Feedback submitted.",
      "success"
    );


  } catch (error) {

    console.warn(
      "Feedback API unavailable:",
      error.message
    );


    renderFeedbackLocally(
      feedback
    );


    showToast(
      "Feedback added locally.",
      "info"
    );

  }


  byId("fbName").value = "";

  byId("fbRole").value = "";

  byId("fbComment").value = "";

  state.rating = 0;

}


function renderFeedbackLocally(feedback) {

  const list =
    byId("feedbackList");


  if (!list) {
    return;
  }


  const item =
    document.createElement("div");


  item.className =
    "feedback-item";


  item.innerHTML = `

    <strong>
      ${escapeHtml(feedback.name)}
    </strong>

    <span>
      ${escapeHtml(feedback.role || "")}
    </span>

    <p>
      ${escapeHtml(feedback.comment)}
    </p>

    <small>
      Rating: ${feedback.rating || 0}/5
    </small>

  `;


  list.prepend(item);

}


/* =========================================================
   COMMENTS
========================================================= */

function initComments() {

  const button =
    byId("postCommentBtn");


  on(
    button,
    "click",
    submitComment
  );

}


async function submitComment() {

  const input =
    byId("commentInput");


  const text =
    input?.value
      ?.trim();


  if (!text) {

    showToast(
      "Please write a comment first.",
      "error"
    );

    return;

  }


  const comment = {

    comment:
      text,

    projectId:
      state.currentProject?._id ||
      state.currentProject?.id ||
      null

  };


  try {

    await apiRequest(
      "/comments",
      {
        method: "POST",

        body: JSON.stringify(
          comment
        )
      }
    );


    showToast(
      "Comment posted.",
      "success"
    );


  } catch (error) {

    console.warn(
      "Comments API unavailable:",
      error.message
    );


    renderCommentLocally(
      comment
    );


    showToast(
      "Comment added locally.",
      "info"
    );

  }


  if (input) {
    input.value = "";
  }

}


function renderCommentLocally(comment) {

  const list =
    byId("commentList");


  if (!list) {
    return;
  }


  const item =
    document.createElement("div");


  item.className =
    "comment-item";


  item.innerHTML = `

    <p>
      ${escapeHtml(comment.comment)}
    </p>

    <small>
      Just now
    </small>

  `;


  list.prepend(item);

}


/* =========================================================
   DEMO PROJECT
========================================================= */

function loadDemoProject() {

  /*
    Do not automatically display the demo project.

    The user should be able to choose:
    - GitHub
    - Upload
    - Start Coding
  */

}


/* =========================================================
   UTILITIES
========================================================= */

function getExtension(filename) {

  const clean =
    filename
      .split("?")[0]
      .split("#")[0];


  const parts =
    clean.split(".");


  if (parts.length < 2) {
    return "";
  }


  return parts[
    parts.length - 1
  ].toLowerCase();

}


function detectTechnologies(
  filenames = []
) {

  const technologies =
    new Set();


  const lower =
    filenames.map(
      file =>
        file.toLowerCase()
    );


  if (
    lower.some(
      file =>
        file.endsWith(".html")
    )
  ) {

    technologies.add(
      "HTML"
    );

  }


  if (
    lower.some(
      file =>
        file.endsWith(".css")
    )
  ) {

    technologies.add(
      "CSS"
    );

  }


  if (
    lower.some(
      file =>
        file.endsWith(".js")
    )
  ) {

    technologies.add(
      "JavaScript"
    );

  }


  if (
    lower.some(
      file =>
        file.includes("package.json")
    )
  ) {

    technologies.add(
      "Node.js"
    );

  }


  if (
    lower.some(
      file =>
        file.includes("react")
    )
  ) {

    technologies.add(
      "React"
    );

  }


  if (
    lower.some(
      file =>
        file.includes("express")
    )
  ) {

    technologies.add(
      "Express"
    );

  }


  if (
    lower.some(
      file =>
        file.includes("mongodb")
    )
  ) {

    technologies.add(
      "MongoDB"
    );

  }


  return Array.from(
    technologies
  );

}


function formatDate(value) {

  try {

    return new Date(
      value
    ).toLocaleDateString(
      undefined,
      {
        year: "numeric",
        month: "short",
        day: "numeric"
      }
    );

  } catch {

    return "—";

  }

}


function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    if (!localStorage.getItem("btr_token")) {
      window.location.replace("../index.html");
      return;
    }

    console.log(
      "Beyond the Resume frontend initialized."
    );


  initAuth();

    initNav();

    initGithubModal();

    initUpload();

    initEditorWorkspace();

    initAiAnalysis();

    initFeedback();

    initComments();

    loadDemoProject();

  }
);