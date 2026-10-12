import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [{ignores: [".local/**", ".preview/**", ".production/**", ".recovery/**"]}, ...nextVitals, ...nextTypescript];

export default config;
