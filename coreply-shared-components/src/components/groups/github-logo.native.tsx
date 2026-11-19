import Svg, { Path } from "react-native-svg";
import { githubLogoPath } from "./github-logo-path";

export function GithubLogo({ color }: { color: string }) {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 98 96"
      style={{ width: 20, height: 20, flexShrink: 0 }}
      accessible={false}
    >
      <Path fill={color} d={githubLogoPath} />
    </Svg>
  );
}
