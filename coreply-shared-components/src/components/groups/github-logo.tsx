import { githubLogoPath } from "./github-logo-path";

export function GithubLogo({ color }: { color: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 98 96"
      style={{ width: 20, height: 20, flexShrink: 0 }}
      aria-hidden="true"
      focusable="false"
    >
      <path fill={color} d={githubLogoPath} />
    </svg>
  );
}
