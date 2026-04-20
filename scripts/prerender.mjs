import { build } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

await build({
  root,
  logLevel: "warn",
  build: {
    ssr: "src/entry-server.tsx",
    outDir: "dist/server",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(root, "src/entry-server.tsx"),
      output: { format: "esm", entryFileNames: "entry-server.mjs" },
    },
  },
  ssr: { noExternal: true },
});

const { render } = await import(path.resolve(root, "dist/server/entry-server.mjs"));

const templatePath = path.resolve(root, "dist/index.html");
const template = await readFile(templatePath, "utf-8");

const meta = {
  fr: {
    htmlLang: "fr",
    title: "Jubilate School | Soutien scolaire en ligne en maths et physique",
    description:
      "Cours particuliers à distance en maths, physique et chimie pour collégiens et lycéens. Accompagnement personnalisé par une professeure expérimentée, spécialiste du CNED international.",
    twitterDescription:
      "Cours particuliers à distance en maths, physique et chimie pour collégiens et lycéens. Spécialiste du CNED international.",
    jsonLdDescription:
      "Soutien scolaire à distance en maths, physique et chimie pour collégiens et lycéens. Spécialiste du CNED international.",
    jsonLdJobTitle: "Professeure de mathématiques et de physique",
    keywords:
      "soutien scolaire, cours particuliers, maths, mathématiques, physique, chimie, CNED international, cours en ligne, collège, lycée, brevet, baccalauréat, tutorat, distanciel",
    ogImageAlt: "Jubilate School — soutien scolaire à distance",
    ogLocale: "fr_FR",
    ogLocaleAlternate: "en_US",
    canonical: "https://www.jubilateschool.fr/",
  },
  en: {
    htmlLang: "en",
    title: "Jubilate School | Online tutoring in maths and physics",
    description:
      "Online private lessons in maths, physics and chemistry for middle- and high-school students. Personalized support by an experienced teacher, specialist of the French CNED International curriculum.",
    twitterDescription:
      "Online private lessons in maths, physics and chemistry for middle- and high-school students. Specialist of CNED International.",
    jsonLdDescription:
      "Online tutoring in maths, physics and chemistry for middle- and high-school students. Specialist of the French CNED International curriculum.",
    jsonLdJobTitle: "Maths and physics teacher",
    keywords:
      "online tutoring, private lessons, maths, mathematics, physics, chemistry, CNED international, online classes, middle school, high school, brevet, baccalaureate, distance learning",
    ogImageAlt: "Jubilate School — online tutoring in maths and physics",
    ogLocale: "en_US",
    ogLocaleAlternate: "fr_FR",
    canonical: "https://www.jubilateschool.fr/en",
  },
};

const hreflangBlock = `
    <link rel="alternate" hreflang="fr" href="https://www.jubilateschool.fr/" />
    <link rel="alternate" hreflang="en" href="https://www.jubilateschool.fr/en" />
    <link rel="alternate" hreflang="x-default" href="https://www.jubilateschool.fr/" />`;

const buildPage = (lang) => {
  const { html, css } = render(lang);
  const m = meta[lang];
  const selfHref = m.canonical;

  let out = template;
  out = out.replace('<html lang="fr">', `<html lang="${m.htmlLang}">`);
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${m.title}</title>`);
  out = out.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="${m.description}" />`
  );
  out = out.replace(
    /<meta\s+name="keywords"\s+content="[^"]*"\s*\/>/,
    `<meta name="keywords" content="${m.keywords}" />`
  );
  out = out.replace(
    /<meta\s+property="og:locale"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:locale" content="${m.ogLocale}" />`
  );
  out = out.replace(
    /<meta\s+property="og:locale:alternate"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:locale:alternate" content="${m.ogLocaleAlternate}" />`
  );
  out = out.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:url" content="${selfHref}" />`
  );
  out = out.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:title" content="${m.title}" />`
  );
  out = out.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${m.description}" />`
  );
  out = out.replace(
    /<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:image:alt" content="${m.ogImageAlt}" />`
  );
  out = out.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:title" content="${m.title}" />`
  );
  out = out.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:description" content="${m.twitterDescription}" />`
  );
  out = out.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${selfHref}" />${hreflangBlock}`
  );
  out = out.replace(
    /"description":\s*"[^"]*"/,
    `"description": "${m.jsonLdDescription}"`
  );
  out = out.replace(
    /"jobTitle":\s*"[^"]*"/,
    `"jobTitle": "${m.jsonLdJobTitle}"`
  );
  out = out.replace(
    /"@type":\s*"EducationalOrganization",\s*"name":\s*"Jubilate School",/,
    `"@type": "EducationalOrganization",\n        "inLanguage": "${m.htmlLang}",\n        "name": "Jubilate School",`
  );
  out = out.replace("</head>", `${css}\n  </head>`);
  out = out.replace('<div id="root"></div>', `<div id="root">${html}</div>`);
  return out;
};

await writeFile(templatePath, buildPage("fr"), "utf-8");

const enDir = path.resolve(root, "dist/en");
await mkdir(enDir, { recursive: true });
await writeFile(path.resolve(enDir, "index.html"), buildPage("en"), "utf-8");

await rm(path.resolve(root, "dist/server"), { recursive: true, force: true });

console.log("prerender: wrote dist/index.html (fr) and dist/en/index.html (en)");
